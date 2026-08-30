import type { ValidatedBatchRow } from '../validation.js'

// ---------- Types ----------

export interface EvidenceItem {
  label: string
  detail?: string
}

export interface EvidenceAnalysis {
  supporting: EvidenceItem[]
  missing: EvidenceItem[]
  contradictory: EvidenceItem[]
  confidence_explanation: string
}

export interface CustomerProfile {
  order_details: string
  payment_info: string
  delivery_status: string
  delivery_timestamp: string | null
  delivery_address: string | null
  ip_address: string | null
  device_match: 'yes' | 'no' | 'unknown'
  delivery_photo_url: string | null
  signature: string | null
  prior_history: { count: number; outcomes: string[] }
}

export interface Dossier {
  confidence_score: number
  customer_profile: CustomerProfile
  evidence_analysis: EvidenceAnalysis
  evidence_letter: string
}

export interface SubmitResult {
  success: boolean
  submitted_at: string
}

// ---------- Helpers ----------

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

const PRODUCTS = [
  'Premium Yoga Mat', 'Bluetooth Speaker', 'Smartwatch',
  'Noise Cancelling Headphones', 'Coffee Grinder', 'Portable Projector',
  'USB-C Dock', 'Air Fryer',
]

// ---------- Mock evidence builder ----------

export async function mockBuildEvidence(
  row: ValidatedBatchRow,
  index: number,
): Promise<Dossier> {
  // Simulate processing time
  await wait(randomBetween(800, 2000))

  // Deliberate failure for testing
  if (row.customer_id === 'CUST-9039') {
    throw new Error('Profile build failed: missing customer metadata')
  }

  const amount = typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount
  const hasPhoto = index % 3 === 0
  const hasSignature = index % 2 === 0
  const deviceMatch = index % 3 === 0 ? 'unknown' : index % 5 === 0 ? 'no' : 'yes'
  const ipKnown = index % 4 !== 0
  const delivered = index % 4 !== 3
  const priorCount = index % 5 === 0 ? 0 : 1 + (index % 3)

  // Build profile
  const customer_profile: CustomerProfile = {
    order_details: `Order #${row.order_id} • ${PRODUCTS[index % PRODUCTS.length]}`,
    payment_info: `Visa ending ••${4200 + index} • Charged $${amount.toFixed(2)}`,
    delivery_status: delivered ? 'Delivered' : 'In transit',
    delivery_timestamp: delivered ? '2026-08-29T14:55:00.000Z' : null,
    delivery_address: index % 5 === 0
      ? null
      : `${1200 + index * 11} Oak Avenue, Suite ${index + 1}, Portland, OR 972${10 + index}`,
    ip_address: ipKnown ? `172.16.${20 + index}.${42 + index}` : null,
    device_match: deviceMatch as 'yes' | 'no' | 'unknown',
    delivery_photo_url: hasPhoto
      ? 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'
      : null,
    signature: hasSignature ? 'Signature captured' : null,
    prior_history: {
      count: priorCount,
      outcomes: priorCount === 0 ? [] : ['won', 'lost'].slice(0, (index % 2) + 1),
    },
  }

  // Build evidence analysis
  const supporting: EvidenceItem[] = []
  const missing: EvidenceItem[] = []
  const contradictory: EvidenceItem[] = []

  if (delivered) {
    supporting.push({ label: 'Delivery confirmed', detail: 'Package marked as delivered by carrier' })
  } else {
    missing.push({ label: 'Delivery confirmation', detail: 'Package not yet marked as delivered' })
  }
  if (hasPhoto) {
    supporting.push({ label: 'Delivery photo', detail: 'Photo proof of delivery available' })
  } else {
    missing.push({ label: 'Delivery photo', detail: 'No delivery photo available' })
  }
  if (hasSignature) {
    supporting.push({ label: 'Signature on file', detail: 'Signature captured' })
  } else {
    missing.push({ label: 'Customer signature', detail: 'No signature was recorded at delivery' })
  }
  if (deviceMatch === 'yes') {
    supporting.push({ label: 'Device match', detail: 'Order device fingerprint matches customer profile' })
  } else if (deviceMatch === 'no') {
    contradictory.push({ label: 'Device mismatch', detail: 'Order was placed from an unrecognized device' })
  } else {
    missing.push({ label: 'Device verification', detail: 'Device fingerprint data unavailable' })
  }
  if (ipKnown) {
    supporting.push({ label: 'IP address recorded', detail: customer_profile.ip_address! })
  } else {
    missing.push({ label: 'IP address', detail: 'Session IP not recorded' })
  }
  if (priorCount >= 3) {
    contradictory.push({
      label: 'Frequent disputes',
      detail: `Customer has ${priorCount} prior disputes`,
    })
  }

  // Compute confidence (in mock — simulates what the pipeline AI would return)
  let confidence = 50
  confidence += delivered ? 15 : -10
  confidence += hasPhoto ? 10 : 0
  confidence += hasSignature ? 8 : 0
  confidence += deviceMatch === 'yes' ? 10 : deviceMatch === 'no' ? -12 : 0
  confidence += ipKnown ? 5 : 0
  confidence += priorCount >= 3 ? -10 : priorCount > 0 ? 2 : 0
  confidence = Math.max(10, Math.min(98, confidence))

  const explanations = [
    'Score based on delivery proof strength and customer history alignment.',
    'Confidence reflects available evidence weight against dispute reason code.',
    'Analysis considers delivery confirmation, device match, and prior dispute pattern.',
  ]

  return {
    confidence_score: confidence,
    customer_profile,
    evidence_analysis: {
      supporting,
      missing,
      contradictory,
      confidence_explanation: explanations[index % explanations.length],
    },
    evidence_letter:
      'Dear payment processor, this charge is supported by the order record, shipping details, and merchant records. ' +
      'The customer request has been reviewed against the transaction trail, and the evidence package confirms the merchant ' +
      'was entitled to fulfillment of the order as presented. We respectfully request that the dispute be resolved in the ' +
      "merchant's favor based on the enclosed documentation.",
  }
}

// ---------- Mock submit ----------

export async function mockSubmitEvidence(
  _dossier: Dossier,
): Promise<SubmitResult> {
  await wait(randomBetween(300, 800))
  return {
    success: true,
    submitted_at: new Date().toISOString(),
  }
}
