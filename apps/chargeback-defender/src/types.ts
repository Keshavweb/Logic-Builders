export type ScreenName = 'intake' | 'review' | 'history'

export type BatchStatus =
  | 'queued'
  | 'building_profile'
  | 'drafting_evidence'
  | 'ready'
  | 'failed'

export type Outcome = 'won' | 'lost' | 'pending'

export type DisputeStatus =
  | 'pending_review'
  | 'submitted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'pending'

export type DeviceMatch = 'yes' | 'no' | 'unknown'

export type BatchRow = {
  dispute_id: string
  order_id: string
  customer_id: string
  reason_code: string
  amount: string
  deadline: string
  transaction_id: string
}

export type BatchProgress = {
  disputeId: string
  status: BatchStatus
  label: string
  error?: string
}

export type ProfileHistory = {
  count: number
  outcomes: string[]
}

export type CustomerProfile = {
  orderDetails?: string
  paymentInfo?: string
  deliveryStatus?: string
  deliveryTimestamp?: string
  deliveryAddress?: string
  ipAddress?: string
  deviceMatch?: DeviceMatch
  deliveryPhotoUrl?: string
  signature?: string
  priorHistory?: ProfileHistory
}

export type EvidenceItem = {
  label: string
  detail?: string
}

export type EvidenceAnalysis = {
  supporting: EvidenceItem[]
  missing: EvidenceItem[]
  contradictory: EvidenceItem[]
  confidenceExplanation?: string
}

export type DisputeRecord = {
  id: string
  customerId: string
  product: string
  amount: number
  reasonCode: string
  deadline: string
  confidence?: number
  status: DisputeStatus
  outcome: Outcome
  profile?: CustomerProfile
  evidenceAnalysis?: EvidenceAnalysis
  evidenceLetter?: string
  submittedAt?: string
  rejectReason?: string
}

export type AllStatus = BatchStatus | DisputeStatus | Outcome
