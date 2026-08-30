import type { AllStatus } from '../types'

const statusStyles: Record<string, string> = {
  queued: 'bg-nav-bg text-text-muted',
  building_profile: 'bg-brand-bg text-brand-dark',
  drafting_evidence: 'bg-purple-bg text-purple',
  ready: 'bg-brand-bg text-brand-dark',
  submitted: 'bg-brand-bg text-brand-dark',
  pending_review: 'bg-purple-bg text-purple',
  pending: 'bg-purple-bg text-purple',
  won: 'bg-success-bg text-success',
  lost: 'bg-danger-bg text-danger',
  rejected: 'bg-warning-bg text-warning',
  failed: 'bg-danger-bg text-danger',
}

const statusLabels: Record<string, string> = {
  queued: 'Queued',
  building_profile: 'Building Profile',
  drafting_evidence: 'Drafting Evidence',
  ready: 'Ready for Review',
  submitted: 'Submitted',
  pending_review: 'Pending Review',
  pending: 'Pending',
  won: 'Won',
  lost: 'Lost',
  rejected: 'Rejected',
  failed: 'Failed',
}

type Props = {
  status: AllStatus | string
  label?: string
}

export default function StatusChip({ status, label }: Props) {
  const style = statusStyles[status] ?? statusStyles.queued
  const displayLabel = label ?? statusLabels[status] ?? status

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${style}`}
    >
      {displayLabel}
    </span>
  )
}
