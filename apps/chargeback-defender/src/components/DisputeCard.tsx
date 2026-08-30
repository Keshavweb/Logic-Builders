import { useState } from 'react'
import type { DisputeRecord } from '../types'
import { formatCurrency, formatDate, getDeadlineWarning, safeText, deviceMatchLabel } from '../utils'
import ConfidenceBadge from './ConfidenceBadge'
import StatusChip from './StatusChip'

type ReviewActions = {
  onApprove: (id: string) => void
  onReject: (id: string, reason: string) => void
}

type Props = {
  dispute: DisputeRecord
  variant: 'review' | 'history'
  expanded: boolean
  onToggle: () => void
  actions?: ReviewActions
}

function DetailItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950/80 p-3">
      <span className="text-xs font-medium uppercase tracking-wider text-gray-400">{label}</span>
      <div className="mt-1.5 text-xs text-gray-200">{children}</div>
    </div>
  )
}

function EvidenceSection({ dispute }: { dispute: DisputeRecord }) {
  const analysis = dispute.evidenceAnalysis
  const supporting = analysis?.supporting ?? []
  const missing = analysis?.missing ?? []
  const contradictory = analysis?.contradictory ?? []
  const explanation = analysis?.confidenceExplanation

  return (
    <div className="mt-4 space-y-4">
      <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">Evidence Analysis</h4>

      {supporting.length > 0 && (
        <div className="rounded-xl border border-green-900/40 bg-green-950/30 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-green-400">Supporting Evidence</p>
          <ul className="space-y-1.5">
            {supporting.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-xs text-gray-300">
                <span className="mt-0.5 text-green-400">✓</span>
                <span>
                  <strong className="text-white">{item.label}</strong>
                  {item.detail ? ` — ${item.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-900/40 bg-amber-950/30 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-400">Missing Evidence</p>
          <ul className="space-y-1.5">
            {missing.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-xs text-gray-300">
                <span className="mt-0.5 text-amber-400">⚠</span>
                <span>
                  <strong className="text-white">{item.label}</strong>
                  {item.detail ? ` — ${item.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {contradictory.length > 0 && (
        <div className="rounded-xl border border-red-900/40 bg-red-950/30 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-red-400">Contradictory / Risk Evidence</p>
          <ul className="space-y-1.5">
            {contradictory.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-xs text-gray-300">
                <span className="mt-0.5 text-red-400">✕</span>
                <span>
                  <strong className="text-white">{item.label}</strong>
                  {item.detail ? ` — ${item.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {supporting.length === 0 && missing.length === 0 && contradictory.length === 0 && (
        <div className="rounded-xl border border-gray-800 bg-gray-950/60 p-4 text-xs text-gray-400">
          No evidence analysis available for this dispute.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-950/60 p-3">
        <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Confidence</span>
        <ConfidenceBadge score={dispute.confidence} />
        {explanation && (
          <span className="text-xs text-gray-400">{explanation}</span>
        )}
      </div>
    </div>
  )
}

function ActionRow({ dispute, actions }: { dispute: DisputeRecord; actions: ReviewActions }) {
  const [confirmAction, setConfirmAction] = useState<'approve' | 'reject' | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  if (confirmAction === 'approve') {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-blue-900/50 bg-blue-950/30 p-3">
        <span className="text-xs font-semibold text-gray-200">Submit this dispute?</span>
        <button
          type="button"
          className="rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800/60 px-4 py-2 text-xs font-semibold text-blue-200 transition"
          onClick={() => {
            actions.onApprove(dispute.id)
            setConfirmAction(null)
          }}
        >
          Confirm submit
        </button>
        <button
          type="button"
          className="rounded-lg bg-gray-800 hover:bg-gray-700 px-4 py-2 text-xs font-semibold text-gray-300 transition"
          onClick={() => setConfirmAction(null)}
        >
          Cancel
        </button>
      </div>
    )
  }

  if (confirmAction === 'reject') {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-red-900/50 bg-red-950/30 p-3">
        <span className="text-xs font-semibold text-gray-200">Reject this dispute?</span>
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Optional short rejection reason"
          className="min-w-56 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs text-white focus:border-red-500 focus:outline-none"
        />
        <button
          type="button"
          className="rounded-lg bg-red-900/80 hover:bg-red-800 px-4 py-2 text-xs font-semibold text-red-200 transition"
          onClick={() => {
            actions.onReject(dispute.id, rejectReason)
            setConfirmAction(null)
          }}
        >
          Confirm reject
        </button>
        <button
          type="button"
          className="rounded-lg border border-gray-800 bg-transparent px-4 py-2 text-xs font-semibold text-gray-400 hover:bg-gray-800 transition"
          onClick={() => setConfirmAction(null)}
        >
          Cancel
        </button>
      </div>
    )
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <button
        type="button"
        className="rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-800/60 px-4 py-2 text-xs font-semibold text-blue-200 transition active:scale-95"
        onClick={() => setConfirmAction('approve')}
      >
        Approve &amp; Submit
      </button>
      <button
        type="button"
        className="rounded-lg bg-gray-800 hover:bg-gray-700 border border-gray-700 px-4 py-2 text-xs font-semibold text-gray-300 transition"
        onClick={() => setConfirmAction('reject')}
      >
        Reject
      </button>
    </div>
  )
}

export default function DisputeCard({ dispute, variant, expanded, onToggle, actions }: Props) {
  const profile = dispute.profile
  const isReview = variant === 'review'

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 p-5 transition hover:border-gray-700">
      {/* Collapsed header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Customer</span>
            <strong className="text-xs font-semibold text-white truncate" title={safeText(dispute.customerId)}>
              {safeText(dispute.customerId)}
            </strong>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Product</span>
            <strong className="text-xs font-semibold text-white truncate" title={safeText(dispute.product)}>
              {safeText(dispute.product)}
            </strong>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Amount</span>
            <strong className="text-xs font-semibold text-white truncate">
              {formatCurrency(dispute.amount)}
            </strong>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Reason</span>
            <strong className="text-xs font-semibold text-gray-300 truncate" title={safeText(dispute.reasonCode)}>
              {safeText(dispute.reasonCode)}
            </strong>
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Deadline</span>
            <strong className={`text-xs font-semibold truncate ${getDeadlineWarning(dispute.deadline) ? 'text-amber-400' : 'text-gray-300'}`}>
              {formatDate(dispute.deadline)}
            </strong>
          </div>
        </div>

        <div className="flex shrink-0 items-center sm:flex-col sm:items-end justify-between sm:justify-center gap-2.5">
          <ConfidenceBadge score={dispute.confidence} />
          <button
            type="button"
            className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-800 hover:text-white"
            onClick={onToggle}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-4 border-t border-gray-800 pt-4">
          {/* Customer Profile Grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <DetailItem label="Order details">
              {safeText(profile?.orderDetails)}
            </DetailItem>
            <DetailItem label="Payment information">
              {safeText(profile?.paymentInfo)}
            </DetailItem>
            <DetailItem label="Delivery status">
              {safeText(profile?.deliveryStatus)}
            </DetailItem>
            <DetailItem label="Delivery timestamp">
              {formatDate(profile?.deliveryTimestamp)}
            </DetailItem>
            <DetailItem label="Delivery address">
              {safeText(profile?.deliveryAddress)}
            </DetailItem>
            <DetailItem label="IP / Device match">
              <div className="flex flex-col gap-0.5">
                <span>IP: {safeText(profile?.ipAddress)}</span>
                <span>Device match: {deviceMatchLabel(profile?.deviceMatch)}</span>
              </div>
            </DetailItem>
            <DetailItem label="Signature">
              {safeText(profile?.signature)}
            </DetailItem>
            <DetailItem label="Past disputes">
              {(profile?.priorHistory?.count ?? 0) > 0 ? (
                <div className="flex flex-col gap-0.5">
                  <span>{profile?.priorHistory?.count} prior dispute(s)</span>
                  <span>
                    {profile?.priorHistory?.outcomes?.length
                      ? `Outcomes: ${profile.priorHistory.outcomes.join(', ')}`
                      : 'No outcomes yet'}
                  </span>
                </div>
              ) : (
                'No prior disputes'
              )}
            </DetailItem>
          </div>

          {/* Delivery photo */}
          <div className="mt-4">
            <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">Delivery Photo</span>
            {profile?.deliveryPhotoUrl ? (
              <img
                src={profile.deliveryPhotoUrl}
                alt="Delivery proof"
                className="mt-2 max-h-44 w-full rounded-xl object-cover border border-gray-800"
              />
            ) : (
              <div className="mt-2 rounded-xl border border-amber-900/40 bg-amber-950/20 p-3 text-xs text-amber-400">
                No delivery photo available
              </div>
            )}
          </div>

          {/* Evidence analysis (review variant only) */}
          {isReview && <EvidenceSection dispute={dispute} />}

          {/* Evidence letter */}
          {dispute.evidenceLetter && (
            <div className="mt-4">
              <span className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
                {isReview ? 'Draft Response' : 'Evidence Letter'}
              </span>
              <div className="mt-2 rounded-xl border border-gray-800 bg-gray-900 p-4 text-xs leading-relaxed text-gray-300">
                {dispute.evidenceLetter}
              </div>
            </div>
          )}

          {/* History variant: show outcome comparison */}
          {variant === 'history' && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-gray-800 bg-gray-900 p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">AI Confidence:</span>
                <ConfidenceBadge score={dispute.confidence} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Actual Result:</span>
                <StatusChip status={dispute.outcome ?? dispute.status} />
              </div>
            </div>
          )}

          {/* Actions (review variant only) */}
          {isReview && actions && <ActionRow dispute={dispute} actions={actions} />}
        </div>
      )}
    </div>
  )
}