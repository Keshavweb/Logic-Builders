import { useState } from 'react'
import type { BatchProgress, DisputeRecord } from '../types'
import DisputeCard from './DisputeCard'
import StatusChip from './StatusChip'

type Props = {
  queueDisputes: DisputeRecord[]
  batchProgress: BatchProgress[]
  isBatchActive: boolean
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}

export default function ReviewQueue({
  queueDisputes,
  batchProgress,
  isBatchActive,
  onApprove,
  onReject,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  return (
    <main className="px-8 pt-7 pb-12 max-sm:px-4">
      <section className="mx-auto max-w-5xl rounded-2xl border border-border bg-panel p-6 shadow-lg shadow-shadow-panel">
        {/* Header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">Review queue</p>
            <h2 className="mt-1 text-2xl font-bold tracking-tight text-text-primary">Pending review</h2>
          </div>
          {queueDisputes.length > 0 && (
            <span className="rounded-full bg-purple-bg px-3 py-0.5 text-xs font-bold text-purple">
              {queueDisputes.length} awaiting review
            </span>
          )}
        </div>

        {/* Live batch progress */}
        {isBatchActive && (
          <div className="mb-5 rounded-xl border border-border bg-surface p-4">
            <h3 className="mb-3 text-sm font-bold text-text-primary">Live batch progress</h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {batchProgress.map((entry) => (
                <div key={entry.disputeId} className="flex items-center justify-between gap-3 rounded-lg border border-border-light bg-white p-2.5">
                  <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                    {entry.disputeId}
                  </span>
                  <StatusChip status={entry.status} label={entry.label} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {queueDisputes.length === 0 && !isBatchActive && (
          <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center text-text-secondary">
            <svg className="mx-auto mb-3 h-12 w-12 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="mb-1.5 text-base font-bold text-text-primary">Everything has been reviewed</h3>
            <p className="text-sm">No disputes are currently waiting for human approval.</p>
          </div>
        )}

        {/* Dispute cards */}
        <div className="flex flex-col gap-4">
          {queueDisputes.map((dispute) => (
            <DisputeCard
              key={dispute.id}
              dispute={dispute}
              variant="review"
              expanded={expandedId === dispute.id}
              onToggle={() => setExpandedId((current) => (current === dispute.id ? null : dispute.id))}
              actions={{ onApprove, onReject }}
            />
          ))}
        </div>
      </section>
    </main>
  )
}
