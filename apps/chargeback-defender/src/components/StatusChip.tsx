import type { AllStatus } from '../types'

const statusStyles: Record<string, string> = {
  queued: 'border border-gray-700 bg-gray-800/80 text-gray-300',
  building_profile: 'border border-blue-800/60 bg-blue-950/80 text-blue-300',
  drafting_evidence: 'border border-purple-800/60 bg-purple-950/80 text-purple-300',
  ready: 'border border-blue-800/60 bg-blue-950/80 text-blue-300',
  submitted: 'border border-blue-800/60 bg-blue-950/80 text-blue-300',
  pending_review: 'border border-purple-800/60 bg-purple-950/80 text-purple-300',
  pending: 'border border-purple-800/60 bg-purple-950/80 text-purple-300',
  won: 'border border-green-800/60 bg-green-950/80 text-green-300',
  lost: 'border border-red-800/60 bg-red-950/80 text-red-300',
  rejected: 'border border-amber-800/60 bg-amber-950/80 text-amber-300',
  failed: 'border border-red-800/60 bg-red-950/80 text-red-300',
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