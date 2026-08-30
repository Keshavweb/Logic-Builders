import { useMemo, useState } from 'react'
import type { DisputeRecord } from '../types'
import { formatCurrency, formatDate } from '../utils'
import ConfidenceBadge from './ConfidenceBadge'
import StatusChip from './StatusChip'

type Props = {
  historyDisputes: DisputeRecord[]
}

export default function OutcomeHistory({ historyDisputes }: Props) {
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const sorted = useMemo(
    () =>
      [...historyDisputes].sort((a, b) => {
        const left = new Date(a.submittedAt ?? a.deadline).getTime()
        const right = new Date(b.submittedAt ?? b.deadline).getTime()
        return sortDirection === 'asc' ? left - right : right - left
      }),
    [historyDisputes, sortDirection],
  )

  const summary = useMemo(() => {
    const total = historyDisputes.length
    const wonCount = historyDisputes.filter((d) => d.outcome === 'won').length
    const lostCount = historyDisputes.filter((d) => d.outcome === 'lost').length
    const totalRecovered = historyDisputes
      .filter((d) => d.outcome === 'won')
      .reduce((sum, d) => sum + d.amount, 0)
    const decidedCount = wonCount + lostCount
    const winRate = decidedCount > 0 ? (wonCount / decidedCount) * 100 : 0

    return { total, winRate, totalRecovered }
  }, [historyDisputes])

  return (
    <main className="px-8 pt-7 pb-12 max-sm:px-4">
      <section className="mx-auto max-w-5xl rounded-2xl border border-border bg-panel p-6 shadow-lg shadow-shadow-panel">
        {/* Header */}
        <div className="mb-5">
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Outcome history</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Resolved disputes</h2>
        </div>

        {/* Summary strip */}
        <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 text-text-secondary">
            <span className="text-xs font-medium uppercase tracking-wider">Total disputes</span>
            <strong className="text-2xl leading-tight text-text-primary">{summary.total}</strong>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 text-text-secondary">
            <span className="text-xs font-medium uppercase tracking-wider">Win rate</span>
            <strong className="text-2xl leading-tight text-text-primary">{summary.winRate.toFixed(1)}%</strong>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface p-4 text-text-secondary">
            <span className="text-xs font-medium uppercase tracking-wider">Total recovered</span>
            <strong className="text-2xl leading-tight text-text-primary">{formatCurrency(summary.totalRecovered)}</strong>
          </div>
        </div>

        {/* Empty state */}
        {sorted.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-text-secondary">
            <h3 className="mb-1.5 text-base font-bold text-text-primary">No outcome history yet</h3>
            <p className="text-sm">Submitted disputes will appear here with their outcomes.</p>
          </div>
        )}

        {/* History table */}
        {sorted.length > 0 && (
          <div className="w-full overflow-x-auto rounded-xl border border-border bg-white">
            <table className="w-full min-w-[640px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-border-light bg-surface px-3.5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Customer
                  </th>
                  <th className="border-b border-border-light bg-surface px-3.5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Amount
                  </th>
                  <th className="border-b border-border-light bg-surface px-3.5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    <button
                      type="button"
                      className="cursor-pointer bg-transparent p-0 text-xs font-bold uppercase tracking-wider text-text-secondary transition-colors hover:text-text-primary"
                      onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                    >
                      Submitted date {sortDirection === 'asc' ? '↑' : '↓'}
                    </button>
                  </th>
                  <th className="border-b border-border-light bg-surface px-3.5 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-secondary">
                    Outcome
                  </th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((dispute) => {
                  const isExpanded = expandedId === dispute.id
                  const outcome = dispute.outcome ?? dispute.status

                  return (
                    <tr
                      key={dispute.id}
                      className="cursor-pointer transition-colors hover:bg-blue-50/40"
                      onClick={() => setExpandedId(isExpanded ? null : dispute.id)}
                    >
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{dispute.customerId}</td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">{formatCurrency(dispute.amount)}</td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">
                        {formatDate(dispute.submittedAt ?? dispute.deadline)}
                      </td>
                      <td className="border-b border-border-light px-3.5 py-3 text-sm">
                        <StatusChip status={outcome} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Expanded detail panel (below table) */}
        {expandedId && (() => {
          const dispute = sorted.find((d) => d.id === expandedId)
          if (!dispute) return null
          const outcome = dispute.outcome ?? dispute.status

          return (
            <div className="mt-4 rounded-xl border border-border-light bg-surface p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Dispute</span>
                  <span className="text-sm font-semibold text-text-primary">{dispute.id}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">AI Confidence:</span>
                  <ConfidenceBadge score={dispute.confidence} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Actual Result:</span>
                  <StatusChip status={outcome} />
                </div>
              </div>
              {dispute.rejectReason && (
                <p className="mt-3 text-xs text-text-secondary">
                  <strong>Rejection reason:</strong> {dispute.rejectReason}
                </p>
              )}
            </div>
          )
        })()}
      </section>
    </main>
  )
}
