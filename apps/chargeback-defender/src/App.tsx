import { useMemo, useState } from 'react'
import type { BatchProgress, BatchRow, DisputeRecord, ScreenName } from './types'
import { processBatchDispute } from './services/disputeService'
import { defaultDisputes } from './services/disputeService'
import BatchIntake from './components/BatchIntake'
import ReviewQueue from './components/ReviewQueue'
import OutcomeHistory from './components/OutcomeHistory'
import Toast from './components/Toast'

function App() {
  const [screen, setScreen] = useState<ScreenName>('intake')
  const [uploadedRows, setUploadedRows] = useState<BatchRow[]>([])
  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([])
  const [disputes, setDisputes] = useState<DisputeRecord[]>(defaultDisputes)
  const [toast, setToast] = useState<string | null>(null)

  // ---------- Helpers ----------

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2800)
  }

  // ---------- Derived data ----------

  const queueDisputes = useMemo(
    () => disputes.filter((d) => d.status === 'pending_review'),
    [disputes],
  )

  const historyDisputes = useMemo(
    () =>
      disputes.filter((d) =>
        ['submitted', 'won', 'lost', 'pending', 'rejected'].includes(d.status),
      ),
    [disputes],
  )

  const isBatchActive = batchProgress.some(
    (e) =>
      e.status === 'queued' ||
      e.status === 'building_profile' ||
      e.status === 'drafting_evidence',
  )

  // ---------- Batch processing ----------

  const runBatch = async () => {
    if (!uploadedRows.length) {
      showToast('Upload a CSV before starting the batch.')
      return
    }

    setScreen('review')
    setBatchProgress(
      uploadedRows.map((row) => ({
        disputeId: row.dispute_id,
        status: 'queued',
        label: 'Queued',
      })),
    )

    let successCount = 0

    for (const [index, row] of uploadedRows.entries()) {
      try {
        const dispute = await processBatchDispute(row, index, (status) => {
          const labelMap: Record<string, string> = {
            queued: 'Queued',
            building_profile: 'Building Profile',
            drafting_evidence: 'Drafting Evidence',
            ready: 'Ready for Review',
            failed: 'Failed',
          }
          setBatchProgress((prev) =>
            prev.map((e) =>
              e.disputeId === row.dispute_id
                ? { ...e, status, label: labelMap[status] ?? status }
                : e,
            ),
          )
        })

        setDisputes((prev) => [dispute, ...prev])
        successCount++
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown processing error'
        setBatchProgress((prev) =>
          prev.map((e) =>
            e.disputeId === row.dispute_id
              ? { ...e, status: 'failed', label: 'Failed', error: errorMessage }
              : e,
          ),
        )
      }
    }

    if (successCount > 0) {
      showToast(`${successCount} disputes are ready for review.`)
    }
  }

  // ---------- Approve / Reject ----------

  const handleApprove = (id: string) => {
    const submittedAt = new Date().toISOString()
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === id
          ? { ...d, status: 'submitted', outcome: 'pending', submittedAt }
          : d,
      ),
    )
    showToast('Dispute approved and submitted to the gateway.')
  }

  const handleReject = (id: string, reason: string) => {
    setDisputes((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              status: 'rejected',
              outcome: 'pending',
              rejectReason: reason || 'No reason provided',
            }
          : d,
      ),
    )
    showToast('Dispute rejected and logged for follow-up.')
  }

  // ---------- Nav ----------

  const navItems: { key: ScreenName; label: string }[] = [
    { key: 'intake', label: 'Batch Intake' },
    { key: 'review', label: 'Review Queue' },
    { key: 'history', label: 'Outcome History' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-surface-alt to-surface">
      {/* Topbar */}
      <header className="flex flex-col items-center justify-between gap-4 border-b border-border bg-white/85 px-8 pt-6 pb-5 backdrop-blur-sm sm:flex-row max-sm:px-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-text-secondary">
            Merchant operations
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tighter text-text-primary">
            Chargeback Defender
          </h1>
        </div>
        <nav
          className="flex items-center gap-1.5 rounded-full bg-nav-bg p-1.5"
          aria-label="Main navigation"
        >
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition-all ${
                screen === item.key
                  ? 'bg-white text-text-primary shadow-md shadow-nav-active-shadow'
                  : 'bg-transparent text-text-muted hover:text-text-primary'
              }`}
              onClick={() => setScreen(item.key)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </header>

      {/* Toast */}
      <Toast message={toast} />

      {/* Screens */}
      {screen === 'intake' && (
        <BatchIntake
          uploadedRows={uploadedRows}
          setUploadedRows={setUploadedRows}
          batchProgress={batchProgress}
          isBatchActive={isBatchActive}
          onRunBatch={runBatch}
          showToast={showToast}
        />
      )}
      {screen === 'review' && (
        <ReviewQueue
          queueDisputes={queueDisputes}
          batchProgress={batchProgress}
          isBatchActive={isBatchActive}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}
      {screen === 'history' && (
        <OutcomeHistory historyDisputes={historyDisputes} />
      )}
    </div>
  )
}

export default App
