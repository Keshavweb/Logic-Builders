import { useMemo, useState } from 'react'
import type { BatchProgress, BatchRow, DisputeRecord, ScreenName } from './types'
import { processBatchDispute, defaultDisputes } from './services/disputeService'
import Header from './components/Header'
import BatchIntake from './components/BatchIntake'
import ReviewQueue from './components/ReviewQueue'
import OutcomeHistory from './components/OutcomeHistory'
import Toast from './components/Toast'
import Login from './components/Login'
import Signup from './components/Signup'
import PipelineFlow from './components/PipelineFlow'
import Footer from './components/Footer'
import HeroHeader from './components/HeroHeader'

function App() {
  const [screen, setScreen] = useState<ScreenName>('front')
  const [uploadedRows, setUploadedRows] = useState<BatchRow[]>([])
  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([])
  const [disputes, setDisputes] = useState<DisputeRecord[]>(defaultDisputes)
  const [toast, setToast] = useState<string | null>(null)

  const showToast = (message: string) => {
  setToast(message)
}

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

  return (
    <div className="min-h-screen bg-black text-white font-inter">
      {/* Header Component */}
      <Header currentScreen={screen} onNavigate={(targetScreen) => setScreen(targetScreen)} />

      {/* Toast */}
      <Toast message={toast} />

      {/* Screens */}
      <main className="p-6">
        {screen === 'front' && (
          <section className="flex flex-col items-center justify-start min-h-screen text-white px-6 pt-24 pb-16">
            <HeroHeader onGetStarted={() => setScreen('signup')} />
            <PipelineFlow />
          </section>
        )}

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

        {screen === 'login' && (
          <Login
            onLogin={(email) => {
              showToast(`Welcome back, ${email}`)
              setScreen('front')
            }}
            goToSignup={() => setScreen('signup')}
          />
        )}

        {screen === 'signup' && (
          <Signup
            onSignup={(email) => {
              showToast(`Welcome, ${email}! Account created.`)
              setScreen('front')
            }}
            goToLogin={() => setScreen('login')}
          />
        )}
      </main>
      
      <Footer onNavigate={(targetScreen) => setScreen(targetScreen)} />
    </div>
  )
}

export default App