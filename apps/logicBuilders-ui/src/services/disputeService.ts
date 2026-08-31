import { USE_MOCK_DATA, PRODUCTS } from '../constants'
import type {
  BatchRow,
  BatchStatus,
  CustomerProfile,
  DisputeRecord,
  EvidenceAnalysis,
} from '../types'
import { wait } from '../utils'

// ---------- Mock data generators ----------

const mockEvidenceAnalysis = (index: number, profile: CustomerProfile): EvidenceAnalysis => {
  const supporting: EvidenceAnalysis['supporting'] = []
  const missing: EvidenceAnalysis['missing'] = []
  const contradictory: EvidenceAnalysis['contradictory'] = []

  if (profile.deliveryStatus === 'Delivered') {
    supporting.push({ label: 'Delivery confirmed', detail: 'Package marked as delivered by carrier' })
  } else {
    missing.push({ label: 'Delivery confirmation', detail: 'Package not yet marked as delivered' })
  }

  if (profile.deliveryPhotoUrl) {
    supporting.push({ label: 'Delivery photo', detail: 'Photo proof of delivery available' })
  } else {
    missing.push({ label: 'Delivery photo', detail: 'No delivery photo available' })
  }

  if (profile.signature && profile.signature !== 'No signature recorded') {
    supporting.push({ label: 'Signature on file', detail: profile.signature })
  } else {
    missing.push({ label: 'Customer signature', detail: 'No signature was recorded at delivery' })
  }

  if (profile.deviceMatch === 'yes') {
    supporting.push({ label: 'Device match', detail: 'Order device fingerprint matches customer profile' })
  } else if (profile.deviceMatch === 'no') {
    contradictory.push({ label: 'Device mismatch', detail: 'Order was placed from an unrecognized device' })
  } else {
    missing.push({ label: 'Device verification', detail: 'Device fingerprint data unavailable' })
  }

  if (profile.ipAddress && profile.ipAddress !== 'unknown') {
    supporting.push({ label: 'IP address recorded', detail: profile.ipAddress })
  } else {
    missing.push({ label: 'IP address', detail: 'Session IP not recorded' })
  }

  if ((profile.priorHistory?.count ?? 0) >= 3) {
    contradictory.push({
      label: 'Frequent disputes',
      detail: `Customer has ${profile.priorHistory?.count} prior disputes`,
    })
  } else if ((profile.priorHistory?.count ?? 0) > 0) {
    supporting.push({
      label: 'Limited dispute history',
      detail: `${profile.priorHistory?.count} prior dispute(s)`,
    })
  }

  const explanations = [
    'Score based on delivery proof strength and customer history alignment.',
    'Confidence reflects available evidence weight against dispute reason code.',
    'Analysis considers delivery confirmation, device match, and prior dispute pattern.',
  ]

  return {
    supporting,
    missing,
    contradictory,
    confidenceExplanation: explanations[index % explanations.length],
  }
}

const buildMockDisputeFromRow = (row: BatchRow, index: number): DisputeRecord => {
  const amount = Number.parseFloat(row.amount) || 0
  const confidence = 58 + (((index + 1) * 7) % 32)

  const hasPhoto = index % 3 === 0
  const profile: CustomerProfile = {
    orderDetails: `Order #${row.order_id} • ${row.transaction_id}`,
    paymentInfo: `Visa ending ••${4200 + index} • Charged ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)}`,
    deliveryStatus: index % 4 === 3 ? 'In transit' : 'Delivered',
    deliveryTimestamp: index % 4 === 3 ? undefined : '2026-08-29T14:55:00.000Z',
    deliveryAddress: index % 5 === 0 ? undefined : `${1200 + index * 11} Oak Avenue, Suite ${index + 1}, Portland, OR 972${10 + index}`,
    ipAddress: index % 4 === 0 ? 'unknown' : `172.16.${20 + index}.${42 + index}`,
    deviceMatch: index % 3 === 0 ? 'unknown' : index % 5 === 0 ? 'no' : 'yes',
    deliveryPhotoUrl: hasPhoto
      ? 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'
      : undefined,
    signature: index % 2 === 0 ? 'Signature captured' : 'No signature recorded',
    priorHistory: {
      count: index % 5 === 0 ? 0 : 1 + (index % 3),
      outcomes: index % 5 === 0 ? [] : ['won', 'lost'].slice(0, (index % 2) + 1),
    },
  }

  const evidenceAnalysis = mockEvidenceAnalysis(index, profile)

  return {
    id: row.dispute_id,
    customerId: row.customer_id,
    product: PRODUCTS[index % PRODUCTS.length],
    amount,
    reasonCode: row.reason_code,
    deadline: row.deadline,
    confidence,
    status: 'pending_review',
    outcome: 'pending',
    profile,
    evidenceAnalysis,
    evidenceLetter:
      'Dear payment processor, this charge is supported by the order record, shipping details, and merchant records. ' +
      'The customer request has been reviewed against the transaction trail, and the evidence package confirms the merchant ' +
      'was entitled to fulfillment of the order as presented. We respectfully request that the dispute be resolved in the ' +
      "merchant's favor based on the enclosed documentation.",
  }
}

// ---------- Default seed disputes ----------

export const defaultDisputes: DisputeRecord[] = [
  {
    id: 'D-1024',
    customerId: 'CUST-1041',
    product: 'Premium Yoga Mat',
    amount: 134.8,
    reasonCode: 'MERCHANT_NOT_RESPONSIBLE',
    deadline: '2026-08-31T18:00:00.000Z',
    confidence: 82,
    status: 'pending_review',
    outcome: 'pending',
    profile: {
      orderDetails: 'Order #20491 • 2-unit bundle',
      paymentInfo: 'Visa ending ••4231 • Charged $134.80',
      deliveryStatus: 'Delivered',
      deliveryTimestamp: '2026-08-29T14:32:00.000Z',
      deliveryAddress: '1847 Elm Street, Apt 4B, Portland, OR 97205',
      ipAddress: '172.16.5.11',
      deviceMatch: 'yes',
      deliveryPhotoUrl:
        'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80',
      signature: 'Signature captured',
      priorHistory: { count: 2, outcomes: ['won', 'lost'] },
    },
    evidenceAnalysis: {
      supporting: [
        { label: 'Delivery confirmed', detail: 'Package marked as delivered by carrier' },
        { label: 'Delivery photo', detail: 'Photo proof of delivery available' },
        { label: 'Signature on file', detail: 'Signature captured' },
        { label: 'Device match', detail: 'Order device fingerprint matches customer profile' },
        { label: 'IP address recorded', detail: '172.16.5.11' },
      ],
      missing: [],
      contradictory: [],
      confidenceExplanation:
        'Strong evidence package with delivery confirmation, photo proof, matching device, and customer signature.',
    },
    evidenceLetter:
      "Dear payment processor, this dispute is based on a delivered order that matched the customer record and shipping confirmation. The customer subsequently attempted to claim the charge was unauthorized, but the order details, delivery proof, and digital signature all support the merchant obligation. Please uphold this response and close the dispute in the merchant's favor.",
  },
  {
    id: 'D-1025',
    customerId: 'CUST-2208',
    product: 'Bluetooth Speaker',
    amount: 203,
    reasonCode: 'DUPLICATE_TRANSACTION',
    deadline: '2026-08-30T22:00:00.000Z',
    confidence: 45,
    status: 'pending_review',
    outcome: 'pending',
    profile: {
      orderDetails: 'Order #11874 • standard shipping',
      paymentInfo: 'Mastercard ending ••8810 • Charged $203.00',
      deliveryStatus: 'Delivered',
      deliveryTimestamp: '2026-08-28T11:15:00.000Z',
      ipAddress: 'unknown',
      deviceMatch: 'unknown',
      signature: 'No signature recorded',
      priorHistory: { count: 0, outcomes: [] },
    },
    evidenceAnalysis: {
      supporting: [
        { label: 'Delivery confirmed', detail: 'Package marked as delivered by carrier' },
      ],
      missing: [
        { label: 'Delivery photo', detail: 'No delivery photo available' },
        { label: 'Customer signature', detail: 'No signature was recorded at delivery' },
        { label: 'Device verification', detail: 'Device fingerprint data unavailable' },
        { label: 'IP address', detail: 'Session IP not recorded' },
        { label: 'Delivery address', detail: 'Address not on file' },
      ],
      contradictory: [],
      confidenceExplanation:
        'Weak case — delivery was confirmed but the evidence chain is incomplete. No photo, no signature, no device match. Human judgment needed.',
    },
    evidenceLetter:
      'Dear payment processor, we have limited evidence on this account. The order was delivered, but the digital chain of evidence is incomplete and the device signature is not consistent with the usual customer pattern. We respectfully ask for a manual review, given the weakness of the record and the need for human judgment on this matter.',
  },
  {
    id: 'D-8701',
    customerId: 'CUST-9017',
    product: 'Coffee Grinder',
    amount: 119,
    reasonCode: 'UNRECOGNIZED_TRANSACTION',
    deadline: '2026-08-29T08:00:00.000Z',
    confidence: 91,
    status: 'won',
    outcome: 'won',
    submittedAt: '2026-08-27T09:15:00.000Z',
    profile: {
      orderDetails: 'Order #33821 • expedited delivery',
      paymentInfo: 'Visa ending ••5502 • Charged $119.00',
      deliveryStatus: 'Delivered',
      deliveryTimestamp: '2026-08-26T12:04:00.000Z',
      deliveryAddress: '9021 Pine Ridge Blvd, Seattle, WA 98101',
      ipAddress: '10.14.22.7',
      deviceMatch: 'yes',
      deliveryPhotoUrl:
        'https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=900&q=80',
      signature: 'Signed by customer',
      priorHistory: { count: 1, outcomes: ['won'] },
    },
    evidenceAnalysis: {
      supporting: [
        { label: 'Delivery confirmed', detail: 'Package marked as delivered by carrier' },
        { label: 'Delivery photo', detail: 'Photo proof of delivery available' },
        { label: 'Signature on file', detail: 'Signed by customer' },
        { label: 'Device match', detail: 'Order device fingerprint matches customer profile' },
      ],
      missing: [],
      contradictory: [],
      confidenceExplanation: 'Very strong case with complete evidence chain and positive prior history.',
    },
    evidenceLetter:
      'The merchant supplied a clear order trace, a delivery confirmation, and a matching customer device fingerprint. The dispute was rejected and the charge was retained.',
  },
  {
    id: 'D-2044',
    customerId: 'CUST-4031',
    product: 'Smartwatch',
    amount: 289,
    reasonCode: 'NOT_AS_DESCRIBED',
    deadline: '2026-08-28T12:00:00.000Z',
    confidence: 63,
    status: 'lost',
    outcome: 'lost',
    submittedAt: '2026-08-25T07:00:00.000Z',
    profile: {
      orderDetails: 'Order #77102 • standard shipping',
      paymentInfo: 'Amex ending ••3019 • Charged $289.00',
      deliveryStatus: 'Delivered',
      deliveryTimestamp: '2026-08-24T09:10:00.000Z',
      deliveryAddress: '340 Maple Lane, Austin, TX 73301',
      ipAddress: '10.18.9.44',
      deviceMatch: 'no',
      signature: 'Signature present',
      priorHistory: { count: 3, outcomes: ['won', 'lost', 'won'] },
    },
    evidenceAnalysis: {
      supporting: [
        { label: 'Delivery confirmed', detail: 'Package marked as delivered by carrier' },
        { label: 'Signature on file', detail: 'Signature present' },
      ],
      missing: [
        { label: 'Delivery photo', detail: 'No delivery photo available' },
      ],
      contradictory: [
        { label: 'Device mismatch', detail: 'Order was placed from an unrecognized device' },
        { label: 'Frequent disputes', detail: 'Customer has 3 prior disputes' },
      ],
      confidenceExplanation:
        'Moderate case weakened by device mismatch and high prior dispute count. Missing delivery photo reduces overall confidence.',
    },
    evidenceLetter:
      'This dispute was ultimately resolved in favor of the customer due to a weaker customer record and a mismatch between the order fingerprint and the customer environment.',
  },
]

// ---------- Service API ----------

type ProgressCallback = (status: BatchStatus) => void

export const processBatchDispute = async (
  row: BatchRow,
  index: number,
  onProgress: ProgressCallback,
): Promise<DisputeRecord> => {
  if (USE_MOCK_DATA) {
    onProgress('queued')
    await wait(300 + Math.random() * 200)

    // Simulate a specific failure
    if (row.customer_id === 'CUST-9039') {
      throw new Error('Profile build failed: missing customer metadata')
    }

    onProgress('building_profile')
    await wait(400 + Math.random() * 300)

    onProgress('drafting_evidence')
    await wait(350 + Math.random() * 250)

    const dispute = buildMockDisputeFromRow(row, index)
    onProgress('ready')

    return dispute
  }

  // TODO: Real RocketRide pipeline call
  // const response = await rocketrideClient.pipelines.run('chargeback-process', { row })
  // return response.data as DisputeRecord
  throw new Error('RocketRide pipeline integration not yet configured')
}

export const submitDispute = async (
  _disputeId: string,
): Promise<{ success: boolean; submittedAt: string }> => {
  if (USE_MOCK_DATA) {
    await wait(200)
    return { success: true, submittedAt: new Date().toISOString() }
  }

  // TODO: Real RocketRide submission pipeline
  throw new Error('RocketRide submit pipeline not yet configured')
}
