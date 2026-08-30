import { getConfidenceMeta } from '../utils'

const severityStyles: Record<string, string> = {
  strong: 'bg-success-bg text-success',
  moderate: 'bg-brand-bg text-brand-dark',
  weak: 'bg-warning-bg text-warning',
}

export default function ConfidenceBadge({ score }: { score?: number }) {
  const meta = getConfidenceMeta(score)
  const style = severityStyles[meta.severity] ?? severityStyles.weak

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full px-3 py-1 text-xs font-bold whitespace-nowrap ${style}`}
    >
      {score != null ? `${score}%` : '—'} — {meta.label}
    </span>
  )
}
