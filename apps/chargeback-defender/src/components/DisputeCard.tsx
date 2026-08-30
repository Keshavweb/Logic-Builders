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
    <div className="rounded-xl border border-border-light bg-surface p-3">
      <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">{label}</span>
      <div className="mt-2 text-sm text-text-primary">{children}</div>
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
      <h4 className="text-sm font-bold text-text-primary">Evidence Analysis</h4>

      {supporting.length > 0 && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-success">Supporting Evidence</p>
          <ul className="space-y-1.5">
            {supporting.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-sm text-text-primary">
                <span className="mt-0.5 text-success">✓</span>
                <span>
                  <strong>{item.label}</strong>
                  {item.detail ? ` — ${item.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {missing.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-warning">Missing Evidence</p>
          <ul className="space-y-1.5">
            {missing.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-sm text-text-primary">
                <span className="mt-0.5 text-warning">⚠</span>
                <span>
                  <strong>{item.label}</strong>
                  {item.detail ? ` — ${item.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {contradictory.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-danger">Contradictory / Risk Evidence</p>
          <ul className="space-y-1.5">
            {contradictory.map((item) => (
              <li key={item.label} className="flex items-start gap-2 text-sm text-text-primary">
                <span className="mt-0.5 text-danger">✕</span>
                <span>
                  <strong>{item.label}</strong>
                  {item.detail ? ` — ${item.detail}` : ''}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {supporting.length === 0 && missing.length === 0 && contradictory.length === 0 && (
        <div className="rounded-xl border border-border-light bg-surface p-4 text-sm text-text-secondary">
          No evidence analysis available for this dispute.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-surface p-3">
        <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Confidence</span>
        <ConfidenceBadge score={dispute.confidence} />
        {explanation && (
          <span className="text-xs text-text-secondary">{explanation}</span>
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
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-surface p-3">
        <span className="text-sm font-semibold text-text-primary">Submit this dispute?</span>
        <button
          type="button"
          className="rounded-xl bg-brand px-4 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
          onClick={() => {
            actions.onApprove(dispute.id)
            setConfirmAction(null)
          }}
        >
          Confirm submit
        </button>
        <button
          type="button"
          className="rounded-xl bg-nav-bg px-4 py-2.5 text-sm font-bold text-text-primary transition-all hover:opacity-80"
          onClick={() => setConfirmAction(null)}
        >
          Cancel
        </button>
      </div>
    )
  }

  if (confirmAction === 'reject') {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-surface p-3">
        <span className="text-sm font-semibold text-text-primary">Reject this dispute?</span>
        <input
          type="text"
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="Optional short rejection reason"
          className="min-w-56 rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
        <button
          type="button"
          className="rounded-xl bg-nav-bg px-4 py-2.5 text-sm font-bold text-text-primary transition-all hover:opacity-80"
          onClick={() => {
            actions.onReject(dispute.id, rejectReason)
            setConfirmAction(null)
          }}
        >
          Confirm reject
        </button>
        <button
          type="button"
          className="rounded-xl border border-border bg-transparent px-4 py-2.5 text-sm font-bold text-text-muted transition-all hover:bg-surface"
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
        className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-95"
        onClick={() => setConfirmAction('approve')}
      >
        Approve &amp; Submit
      </button>
      <button
        type="button"
        className="rounded-xl bg-nav-bg px-5 py-2.5 text-sm font-bold text-text-primary transition-all hover:opacity-80"
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
    <div className="rounded-2xl border border-border bg-white p-5 transition-shadow hover:shadow-md">
      {/* Collapsed header */}
      <div className="flex items-start justify-between gap-4">
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Customer</span>
            <strong className="text-sm text-text-primary">{safeText(dispute.customerId)}</strong>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Product</span>
            <strong className="text-sm text-text-primary">{safeText(dispute.product)}</strong>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Amount</span>
            <strong className="text-sm text-text-primary">{formatCurrency(dispute.amount)}</strong>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Reason</span>
            <strong className="text-sm text-text-primary">{safeText(dispute.reasonCode)}</strong>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Deadline</span>
            <strong className={`text-sm ${getDeadlineWarning(dispute.deadline) ? 'text-warning-text' : 'text-text-primary'}`}>
              {formatDate(dispute.deadline)}
            </strong>
          </div>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <ConfidenceBadge score={dispute.confidence} />
          <button
            type="button"
            className="rounded-xl border border-border bg-transparent px-3 py-2 text-xs font-bold text-text-muted transition-all hover:bg-surface"
            onClick={onToggle}
          >
            {expanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="mt-4 border-t border-border-light pt-4">
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
            <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">Delivery Photo</span>
            {profile?.deliveryPhotoUrl ? (
              <img
                src={profile.deliveryPhotoUrl}
                alt="Delivery proof"
                className="mt-2.5 max-h-44 w-full rounded-xl object-cover"
              />
            ) : (
              <div className="mt-2.5 rounded-xl border border-warning-orange-border bg-warning-orange-bg p-3 text-sm text-warning-orange">
                No delivery photo available
              </div>
            )}
          </div>

          {/* Evidence analysis (review variant only) */}
          {isReview && <EvidenceSection dispute={dispute} />}

          {/* Evidence letter */}
          {dispute.evidenceLetter && (
            <div className="mt-4">
              <span className="text-xs font-medium uppercase tracking-wider text-text-secondary">
                {isReview ? 'Draft Response' : 'Evidence Letter'}
              </span>
              <div className="mt-2.5 rounded-xl border border-border bg-surface p-4 text-sm leading-relaxed text-text-primary">
                {dispute.evidenceLetter}
              </div>
            </div>
          )}

          {/* History variant: show outcome comparison */}
          {variant === 'history' && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-border-light bg-surface p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">AI Confidence:</span>
                <ConfidenceBadge score={dispute.confidence} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-text-secondary">Actual Result:</span>
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
