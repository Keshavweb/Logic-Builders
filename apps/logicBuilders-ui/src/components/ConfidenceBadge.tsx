import { getConfidenceMeta } from '../utils'

const severityStyles: Record<string, string> = {
  strong: 'border border-green-800/60 bg-green-950/80 text-green-300',
  moderate: 'border border-blue-800/60 bg-blue-950/80 text-blue-300',
  weak: 'border border-amber-800/60 bg-amber-950/80 text-amber-300',
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