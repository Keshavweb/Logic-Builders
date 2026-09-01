import { config } from '../config.js'
import type { ValidatedBatchRow } from '../validation.js'

// ---------------------------------------------------------------------------
// Types (shared by the real pipeline path and the mock path)
// ---------------------------------------------------------------------------

export interface EvidenceItem {
  label: string
  detail?: string
}

export interface EvidenceAnalysis {
  supporting: EvidenceItem[]
  missing: EvidenceItem[]
  contradictory: EvidenceItem[]
  confidenceExplanation: string
}

export interface CustomerProfile {
  orderDetails: string | null
  paymentInfo: string | null
  deliveryStatus: string | null
  deliveryTimestamp: string | null
  deliveryAddress: string | null
  ipAddress: string | null
  deviceMatch: 'yes' | 'no' | 'unknown'
  deliveryPhotoUrl: string | null
  signature: string | null
  priorHistory: { count: number; outcomes: string[] }
}

export interface Signals {
  delivery_confirmed: boolean
  delivery_photo_available: boolean
  device_match: boolean
  address_match: boolean
  prior_disputes_count: number
  days_since_delivery: number
}

export interface EvidenceData {
  order: Record<string, any> | null
  session: Record<string, any> | null
  delivery: Record<string, any> | null
  customer: Record<string, any> | null
  lookupErrors: string[]
}

export interface Dossier {
  confidence_score: number
  confidence_label: string
  missing_evidence: string[]
  customer_profile: CustomerProfile
  evidence_analysis: EvidenceAnalysis
  evidence_letter: string
}

export interface SubmitResult {
  success: boolean
  submitted_at: string
}

// ---------------------------------------------------------------------------
// Backing-service lookups
// ---------------------------------------------------------------------------

async function getJson(url: string): Promise<any | null> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    const res = await fetch(url, { signal: controller.signal })
    clearTimeout(timeout)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function fetchEvidenceData(row: ValidatedBatchRow): Promise<EvidenceData> {
  const base = config.MOCK_SERVICES_URL
  const tid = encodeURIComponent(row.transaction_id)
  const cid = encodeURIComponent(row.customer_id)

  const [order, session, delivery, customer] = await Promise.all([
    getJson(`${base}/api/mock/order?transaction_id=${tid}`),
    getJson(`${base}/api/mock/session?transaction_id=${tid}`),
    getJson(`${base}/api/mock/delivery?transaction_id=${tid}`),
    getJson(`${base}/api/mock/customer?customer_id=${cid}`),
  ])

  const lookupErrors: string[] = []
  if (!order) lookupErrors.push('order_lookup')
  if (!session) lookupErrors.push('session_lookup')
  if (!delivery) lookupErrors.push('delivery_lookup')
  if (!customer) lookupErrors.push('customer_history_lookup')

  return { order, session, delivery, customer, lookupErrors }
}

// ---------------------------------------------------------------------------
// Signal extraction
// ---------------------------------------------------------------------------

const normalizeAddress = (value?: string | null): string | null =>
  value ? value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim() : null

export function computeSignals(data: EvidenceData): { signals: Signals; missing: string[] } {
  const missing: string[] = []
  const { order, session, delivery, customer } = data

  const delivery_confirmed = delivery?.status === 'delivered'
  if (!delivery || !delivery_confirmed) missing.push('delivery_confirmation')

  const delivery_photo_available = Boolean(delivery?.photo_available)
  if (delivery && !delivery_photo_available) missing.push('delivery_photo')

  if (delivery && !delivery.signature_available) missing.push('customer_signature')

  const device_match = session?.device_match === true
  if (!session) missing.push('session_data')
  else if (session.device_match === 'unknown' || session.device_match == null) {
    missing.push('device_verification')
  }

  if (!session?.ip_address) missing.push('ip_address')

  const billing = normalizeAddress(order?.billing_address)
  const shipping = normalizeAddress(order?.shipping_address ?? delivery?.delivery_address)
  const address_match = Boolean(billing && shipping && billing === shipping)
  if (!shipping) missing.push('shipping_address')

  const prior_disputes_count = Number(customer?.prior_disputes_count ?? 0)
  if (!customer) missing.push('customer_history')

  let days_since_delivery = 0
  if (delivery?.delivered_at) {
    const ms = Date.now() - new Date(delivery.delivered_at).getTime()
    if (!Number.isNaN(ms)) days_since_delivery = Math.max(0, Math.round(ms / 86_400_000))
  } else if (typeof delivery?.days_since_delivery === 'number') {
    days_since_delivery = delivery.days_since_delivery
  }

  return {
    signals: {
      delivery_confirmed,
      delivery_photo_available,
      device_match,
      address_match,
      prior_disputes_count,
      days_since_delivery,
    },
    missing,
  }
}

// ---------------------------------------------------------------------------
// Confidence scoring — mirrors the guide from the original pipeline prompt
// ---------------------------------------------------------------------------

export function confidenceLabel(score: number): string {
  if (score >= 80) return 'strong case'
  if (score >= 60) return 'moderate case'
  if (score >= 40) return 'weak evidence'
  return 'insufficient evidence'
}

export function computeConfidence(
  signals: Signals,
  reasonCode: string,
): { score: number; label: string } {
  let score = 20 // base

  if (signals.delivery_confirmed) score += 20
  if (signals.delivery_photo_available) score += 15
  if (signals.device_match) score += 15
  if (signals.address_match) score += 10
  if (signals.prior_disputes_count === 0) score += 10
  else score -= 5 * signals.prior_disputes_count
  if (signals.delivery_confirmed && signals.days_since_delivery <= 3) score += 10

  // Fraud disputes hinge on identity signals rather than delivery proof.
  if (reasonCode === 'unauthorized_transaction') {
    if (signals.device_match) score += 5
    if (signals.address_match) score += 5
    if (!signals.device_match && !signals.address_match) score -= 10
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  // We cannot compare sibling transactions here, so a duplicate-charge claim
  // can never be a "strong case" from this data alone.
  if (reasonCode === 'duplicate_charge' && score > 79) score = 79

  return { score, label: confidenceLabel(score) }
}

export const countFavorableSignals = (signals: Signals): number =>
  [
    signals.delivery_confirmed,
    signals.delivery_photo_available,
    signals.device_match,
    signals.address_match,
    signals.prior_disputes_count === 0,
    signals.delivery_confirmed && signals.days_since_delivery <= 3,
  ].filter(Boolean).length

// ---------------------------------------------------------------------------
// Customer profile (camelCase — consumed directly by the UI)
// ---------------------------------------------------------------------------

export function buildCustomerProfile(
  row: ValidatedBatchRow,
  data: EvidenceData,
): CustomerProfile {
  const { order, session, delivery, customer } = data
  const amount = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount
  const currency = (order?.currency as string) ?? 'USD'
  const money = new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)

  const deviceMatch: CustomerProfile['deviceMatch'] =
    session?.device_match === true
      ? 'yes'
      : session?.device_match === false
        ? 'no'
        : 'unknown'

  const deliveryStatus = delivery
    ? delivery.status === 'delivered'
      ? 'Delivered'
      : delivery.status === 'in_transit'
        ? 'In transit'
        : 'Unknown'
    : null

  return {
    orderDetails: order
      ? `Order ${order.order_id ?? row.order_id} • ${order.product ?? 'Disputed item'}`
      : null,
    paymentInfo: order?.payment_method
      ? `${order.payment_method} • Charged ${money}`
      : `Charged ${money}`,
    deliveryStatus,
    deliveryTimestamp: (delivery?.delivered_at as string) ?? null,
    deliveryAddress:
      (order?.shipping_address as string) ?? (delivery?.delivery_address as string) ?? null,
    ipAddress: (session?.ip_address as string) ?? null,
    deviceMatch,
    deliveryPhotoUrl: (delivery?.photo_url as string) ?? null,
    signature: delivery?.signature_available ? 'Signature captured' : null,
    priorHistory: {
      count: Number(customer?.prior_disputes_count ?? 0),
      outcomes: Array.isArray(customer?.prior_outcomes) ? customer!.prior_outcomes : [],
    },
  }
}

// ---------------------------------------------------------------------------
// Evidence analysis (supporting / missing / contradictory)
// ---------------------------------------------------------------------------

export function deriveEvidenceAnalysis(
  signals: Signals,
  profile: CustomerProfile,
  lookupErrors: string[],
  explanation: string,
): EvidenceAnalysis {
  const supporting: EvidenceItem[] = []
  const missing: EvidenceItem[] = []
  const contradictory: EvidenceItem[] = []

  if (signals.delivery_confirmed) {
    supporting.push({ label: 'Delivery confirmed', detail: 'Carrier marked the package as delivered' })
  } else {
    missing.push({ label: 'Delivery confirmation', detail: 'Package not marked as delivered' })
  }

  if (signals.delivery_photo_available) {
    supporting.push({ label: 'Delivery photo', detail: 'Photo proof of delivery on file' })
  } else {
    missing.push({ label: 'Delivery photo', detail: 'No delivery photo available' })
  }

  if (profile.signature) {
    supporting.push({ label: 'Signature on file', detail: profile.signature })
  } else {
    missing.push({ label: 'Customer signature', detail: 'No signature captured at delivery' })
  }

  if (signals.device_match) {
    supporting.push({ label: 'Device match', detail: 'Order device fingerprint matches the customer profile' })
  } else if (profile.deviceMatch === 'no') {
    contradictory.push({ label: 'Device mismatch', detail: 'Order was placed from an unrecognized device' })
  } else {
    missing.push({ label: 'Device verification', detail: 'Device fingerprint data unavailable' })
  }

  if (profile.ipAddress) {
    supporting.push({ label: 'IP address recorded', detail: profile.ipAddress })
  } else {
    missing.push({ label: 'IP address', detail: 'Session IP not recorded' })
  }

  if (signals.address_match) {
    supporting.push({ label: 'Address match', detail: 'Billing and shipping addresses match' })
  } else {
    missing.push({ label: 'Address match', detail: 'Billing and shipping addresses differ or are unavailable' })
  }

  if (signals.prior_disputes_count === 0) {
    supporting.push({ label: 'No prior disputes', detail: 'Customer has no dispute history' })
  } else if (signals.prior_disputes_count >= 3) {
    contradictory.push({
      label: 'Frequent disputes',
      detail: `Customer has ${signals.prior_disputes_count} prior disputes`,
    })
  } else {
    supporting.push({
      label: 'Limited dispute history',
      detail: `${signals.prior_disputes_count} prior dispute(s)`,
    })
  }

  for (const err of lookupErrors) {
    missing.push({ label: err.replace(/_/g, ' '), detail: 'Upstream system did not return data' })
  }

  return { supporting, missing, contradictory, confidenceExplanation: explanation }
}

// ---------------------------------------------------------------------------
// Fallback letter (used when the LLM draft is missing or too short)
// ---------------------------------------------------------------------------

export function fallbackLetter(
  row: ValidatedBatchRow,
  profile: CustomerProfile,
  signals: Signals,
  label: string,
): string {
  const favorable: string[] = []
  if (signals.delivery_confirmed) favorable.push('the carrier confirmed delivery of the order')
  if (signals.delivery_photo_available) favorable.push('photo proof of delivery is on file')
  if (profile.signature) favorable.push('a delivery signature was captured')
  if (signals.device_match) favorable.push('the ordering device matched the customer profile')
  if (signals.address_match) favorable.push('the billing and shipping addresses match')
  if (signals.prior_disputes_count === 0) favorable.push('the customer has no prior dispute history')

  const evidenceSentence = favorable.length
    ? `Our records show that ${favorable.join(', ')}.`
    : 'Our records for this transaction are limited.'

  const ask =
    label === 'weak evidence' || label === 'insufficient evidence'
      ? 'Given the gaps in the available record, we request a manual review of this dispute.'
      : "We respectfully request that this dispute be resolved in the merchant's favor."

  return [
    `Dear Dispute Resolution Team,`,
    ``,
    `We are contesting dispute ${row.dispute_id}, filed under reason code "${row.reason_code}" for ${profile.paymentInfo ?? 'the disputed charge'}.`,
    ``,
    evidenceSentence,
    `The transaction trail, order record, and delivery details together indicate that the merchant fulfilled its obligation as presented.`,
    ``,
    ask,
    ``,
    `Sincerely,`,
    `Merchant Dispute Operations`,
  ].join(' ')
}

// ---------------------------------------------------------------------------
// Deterministic fake data for the mock path (no backing services)
// ---------------------------------------------------------------------------

export function fakeEvidenceData(row: ValidatedBatchRow, index: number): EvidenceData {
  const delivered = index % 4 !== 3
  const hasPhoto = index % 3 === 0
  const hasSignature = index % 2 === 0
  const deviceMatch = index % 3 === 0 ? 'unknown' : index % 5 === 0 ? false : true
  const ipKnown = index % 4 !== 0
  const hasShipping = index % 5 !== 0
  const priorCount = index % 5 === 0 ? 0 : 1 + (index % 3)
  const deliveredDaysAgo = 1 + (index % 9)
  const street = 1200 + index * 11
  const zip = `972${10 + index}`

  return {
    order: {
      transaction_id: row.transaction_id,
      order_id: row.order_id,
      product: ['Premium Yoga Mat', 'Bluetooth Speaker', 'Smartwatch', 'Air Fryer', 'USB-C Dock'][index % 5],
      amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
      currency: 'USD',
      payment_method: `Visa ending ${4200 + index}`,
      billing_address: `${street} Main Street, Portland, OR ${zip}`,
      shipping_address: hasShipping
        ? `${street} Main Street, Portland, OR ${zip}`
        : `${street + 40} Oak Avenue, Suite ${index + 1}, Portland, OR ${zip}`,
    },
    session: {
      transaction_id: row.transaction_id,
      ip_address: ipKnown ? `172.16.${20 + index}.${42 + index}` : null,
      device_match: deviceMatch,
      login_location: ipKnown ? 'Portland, OR, US' : null,
    },
    delivery: {
      transaction_id: row.transaction_id,
      carrier: ['UPS', 'FedEx', 'USPS', 'DHL'][index % 4],
      status: delivered ? 'delivered' : 'in_transit',
      delivered_at: delivered
        ? new Date(Date.now() - deliveredDaysAgo * 86_400_000).toISOString()
        : null,
      signature_available: delivered && hasSignature,
      photo_available: delivered && hasPhoto,
      photo_url:
        delivered && hasPhoto
          ? 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'
          : null,
      days_since_delivery: delivered ? deliveredDaysAgo : null,
    },
    customer: {
      customer_id: row.customer_id,
      prior_disputes_count: priorCount,
      prior_outcomes: priorCount === 0 ? [] : ['won', 'lost'].slice(0, (index % 2) + 1),
    },
    lookupErrors: [],
  }
}

// ---------------------------------------------------------------------------
// Full assembly (shared by both paths; the LLM only supplies the two strings)
// ---------------------------------------------------------------------------

export function assembleDossier(
  row: ValidatedBatchRow,
  data: EvidenceData,
  llm: { letter: string; explanation: string },
): Dossier {
  const { signals, missing } = computeSignals(data)
  const missingEvidence = Array.from(new Set([...missing, ...data.lookupErrors]))
  if (row.reason_code === 'duplicate_charge') {
    missingEvidence.push('duplicate_transaction_comparison')
  }

  const { score, label } = computeConfidence(signals, row.reason_code)
  const profile = buildCustomerProfile(row, data)

  const explanation =
    llm.explanation ||
    `Score ${score}/100 (${label}) — ${countFavorableSignals(signals)} favorable signal(s)` +
      (missingEvidence.length ? `, ${missingEvidence.length} missing evidence item(s)` : '') +
      '.'

  const letter =
    llm.letter && llm.letter.length >= 50
      ? llm.letter
      : fallbackLetter(row, profile, signals, label)

  return {
    confidence_score: score,
    confidence_label: label,
    missing_evidence: missingEvidence,
    customer_profile: profile,
    evidence_analysis: deriveEvidenceAnalysis(signals, profile, data.lookupErrors, explanation),
    evidence_letter: letter,
  }
}
