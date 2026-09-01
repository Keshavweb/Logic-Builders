// =============================================================================
// MIT License
// Copyright (c) 2026 Aparavi Software AG
// =============================================================================

/**
 * Logic Builders — root component rendered by the RocketRide shell.
 */

import React, { useMemo, useState } from 'react'
import type { ShellAppProps } from 'shell'
import { AppLayout } from 'shell'

import type {
  BatchProgress,
  BatchRow,
  DisputeRecord,
  ScreenName,
} from './types'

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

// =============================================================================
// LOGIC BUILDERS APPLICATION
// =============================================================================

// Where the chargeback-defender API lives. Set at build time:
//   - Vite build/dev:  VITE_API_BASE_URL
//   - rsbuild (RocketRide shell):  PUBLIC_API_BASE_URL
// Falls back to localhost for local dev.
const ENV = ((import.meta as any).env ?? {}) as Record<string, string | undefined>
const API_BASE_URL =
  ENV.VITE_API_BASE_URL ||
  ENV.PUBLIC_API_BASE_URL ||
  'http://localhost:4000'

/** Map an API dispute row (with embedded dossier) to the UI DisputeRecord. */
const mapDispute = (row: any): DisputeRecord => {
  const profile = row.dossier?.customer_profile
  return {
    id: row.dispute_id,
    customerId: row.customer_id,
    product: profile?.orderDetails ?? 'Disputed product',
    amount: row.amount,
    reasonCode: row.reason_code,
    deadline: row.deadline,
    confidence: row.confidence_score ?? row.dossier?.confidence_score ?? 0,
    status: row.status as DisputeRecord['status'],
    outcome: (row.outcome ?? 'pending') as DisputeRecord['outcome'],
    profile,
    evidenceAnalysis: row.dossier?.evidence_analysis,
    evidenceLetter: row.dossier?.evidence_letter,
    submittedAt: row.submitted_at,
    rejectReason: row.rejection_reason,
  }
}

const LogicBuildersApp: React.FC<ShellAppProps> = ({
  isConnected,
  identity,
}) => {
  const [screen, setScreen] = useState<ScreenName>('front')

  const [uploadedRows, setUploadedRows] = useState<BatchRow[]>([])

  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([])

  const [disputes, setDisputes] = useState<DisputeRecord[]>([])

  const [toast, setToast] = useState<string | null>(null)

  React.useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const baseUrl = API_BASE_URL
        const res = await fetch(`${baseUrl}/api/disputes`)
        if (res.ok) {
          const { disputes: realDisputes } = await res.json()
          if (Array.isArray(realDisputes)) {
            setDisputes(realDisputes.map(mapDispute))
          }
        }
      } catch (e) {
        console.error('Failed to fetch initial disputes', e)
      }
    }
    fetchDisputes()
  }, [])

  // ---------------------------------------------------------------------------
  // Toast
  // ---------------------------------------------------------------------------

  const showToast = (message: string) => {
    setToast(message)
  }

  // ---------------------------------------------------------------------------
  // Review Queue
  // ---------------------------------------------------------------------------

  const queueDisputes = useMemo(
    () =>
      disputes.filter(
        (dispute) => dispute.status === 'pending_review',
      ),
    [disputes],
  )

  // ---------------------------------------------------------------------------
  // History
  // ---------------------------------------------------------------------------

  const historyDisputes = useMemo(
    () =>
      disputes.filter((dispute) =>
        [
          'submitted',
          'won',
          'lost',
          'pending',
          'rejected',
        ].includes(dispute.status),
      ),
    [disputes],
  )

  // ---------------------------------------------------------------------------
  // Batch State
  // ---------------------------------------------------------------------------

  const isBatchActive = batchProgress.some(
    (entry) =>
      entry.status === 'queued' ||
      entry.status === 'building_profile' ||
      entry.status === 'drafting_evidence',
  )

  // ---------------------------------------------------------------------------
  // Run Batch
  // ---------------------------------------------------------------------------

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

    try {
      const baseUrl = API_BASE_URL
      const response = await fetch(`${baseUrl}/api/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputes: uploadedRows }),
      })

      if (!response.ok) {
        let detail = `Batch submission failed (${response.status})`
        try {
          const body = await response.json()
          if (body?.error) detail = body.error
          const fieldErrs = body?.details && Object.values(body.details).flat()
          if (fieldErrs?.length) detail += `: ${fieldErrs.join('; ')}`
        } catch {
          /* keep default */
        }
        setBatchProgress((prev) =>
          prev.map((e) => ({ ...e, status: 'failed', label: 'Failed', error: detail })),
        )
        showToast(detail)
        return
      }

      // Mark rows the API could not even queue as failed up front.
      try {
        const { errors } = await response.clone().json()
        if (Array.isArray(errors) && errors.length) {
          const failedIds = new Map(errors.map((x: any) => [x.dispute_id, x.error]))
          setBatchProgress((prev) =>
            prev.map((e) =>
              failedIds.has(e.disputeId)
                ? { ...e, status: 'failed', label: 'Failed', error: failedIds.get(e.disputeId) }
                : e,
            ),
          )
        }
      } catch {
        /* non-fatal */
      }

      // Start polling
      let ticks = 0
      const pollInterval = setInterval(async () => {
        ticks += 1
        if (ticks > 300) {
          clearInterval(pollInterval)
          showToast('Batch is taking longer than expected — check the Review Queue.')
          return
        }
        try {
          const res = await fetch(`${baseUrl}/api/disputes`)
          if (!res.ok) return
          const { disputes: updatedDisputes } = await res.json()

          let allDone = true

          setBatchProgress((prev) => {
            return prev.map((entry) => {
              if (entry.status === 'failed') return entry

              const updated = updatedDisputes.find((d: any) => d.dispute_id === entry.disputeId)
              if (!updated) {
                allDone = false // not in the DB yet — keep polling
                return entry
              }

              const status = updated.status
              const labelMap: Record<string, string> = {
                queued: 'Queued',
                building: 'Building Profile',
                drafting_evidence: 'Drafting Evidence',
                pending_review: 'Ready for Review',
                failed: 'Failed',
              }

              if (status !== 'pending_review' && status !== 'failed') {
                allDone = false
              }

              return {
                ...entry,
                status: status === 'pending_review' ? 'ready' : status,
                label: labelMap[status] ?? status,
                error: updated.error_message,
              }
            })
          })

          if (Array.isArray(updatedDisputes)) {
            setDisputes(updatedDisputes.map(mapDispute))
          }

          if (allDone) {
            clearInterval(pollInterval)
            showToast('Batch processing complete.')
          }
        } catch (err) {
          console.error('Polling error', err)
        }
      }, 2000)

    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Unknown processing error'
      showToast(errorMessage)
    }
  }

  // ---------------------------------------------------------------------------
  // Approve Dispute
  // ---------------------------------------------------------------------------

  const handleApprove = async (id: string) => {
    try {
      const baseUrl = API_BASE_URL
      const res = await fetch(`${baseUrl}/api/disputes/${id}/approve`, {
        method: 'POST'
      })

      if (!res.ok) {
        throw new Error('Approval failed')
      }

      const data = await res.json()
      
      setDisputes((previous) =>
        previous.map((dispute) =>
          dispute.id === id
            ? {
                ...dispute,
                status: 'submitted',
                outcome: 'pending',
                submittedAt: data.submitted_at || new Date().toISOString(),
              }
            : dispute,
        ),
      )

      showToast('Dispute approved and submitted to the gateway.')
    } catch (err) {
      showToast('Error approving dispute: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // ---------------------------------------------------------------------------
  // Reject Dispute
  // ---------------------------------------------------------------------------

  const handleReject = async (id: string, reason: string) => {
    try {
      const baseUrl = API_BASE_URL
      const res = await fetch(`${baseUrl}/api/disputes/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason }),
      })

      if (!res.ok) {
        throw new Error('Rejection failed')
      }

      setDisputes((previous) =>
        previous.map((dispute) =>
          dispute.id === id
            ? {
                ...dispute,
                status: 'rejected',
                outcome: 'pending',
                rejectReason: reason || 'No reason provided',
              }
            : dispute,
        ),
      )

      showToast('Dispute rejected and logged for follow-up.')
    } catch (err) {
      showToast('Error rejecting dispute: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-black text-white font-inter">
      <Header
        currentScreen={screen}
        onNavigate={(targetScreen) =>
          setScreen(targetScreen)
        }
      />

      <Toast message={toast} />

      <main className="p-6">
        {/* --------------------------------------------------------------- */}
        {/* Landing / Front Page */}
        {/* --------------------------------------------------------------- */}

        {screen === 'front' && (
          <section className="flex min-h-screen flex-col items-center justify-start px-6 pt-24 pb-16 text-white">
            <HeroHeader
              onGetStarted={() =>
                setScreen('signup')
              }
            />

            <PipelineFlow />
          </section>
        )}

        {/* --------------------------------------------------------------- */}
        {/* Batch Intake */}
        {/* --------------------------------------------------------------- */}

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

        {/* --------------------------------------------------------------- */}
        {/* Review Queue */}
        {/* --------------------------------------------------------------- */}

        {screen === 'review' && (
          <ReviewQueue
            queueDisputes={queueDisputes}
            batchProgress={batchProgress}
            isBatchActive={isBatchActive}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        )}

        {/* --------------------------------------------------------------- */}
        {/* Outcome History */}
        {/* --------------------------------------------------------------- */}

        {screen === 'history' && (
          <OutcomeHistory
            historyDisputes={historyDisputes}
          />
        )}

        {/* --------------------------------------------------------------- */}
        {/* Login */}
        {/* --------------------------------------------------------------- */}

        {screen === 'login' && (
          <Login
            onLogin={(email) => {
              showToast(`Welcome back, ${email}`)
              setScreen('front')
            }}
            goToSignup={() =>
              setScreen('signup')
            }
          />
        )}

        {/* --------------------------------------------------------------- */}
        {/* Signup */}
        {/* --------------------------------------------------------------- */}

        {screen === 'signup' && (
          <Signup
            onSignup={(email) => {
              showToast(
                `Welcome, ${email}! Account created.`,
              )

              setScreen('front')
            }}
            goToLogin={() =>
              setScreen('login')
            }
          />
        )}
      </main>

      <Footer
        onNavigate={(targetScreen) =>
          setScreen(targetScreen)
        }
      />

      {/* ---------------------------------------------------------------- */}
      {/* RocketRide connection information                                 */}
      {/* ---------------------------------------------------------------- */}

      {/*

        RocketRide provides these values through ShellAppProps:

        isConnected
        identity

        They are intentionally not rendered into the UI because the
        Logic Builders application manages its own visible authentication
        screens.

        If needed later, you can use:

        isConnected
        identity?.displayName

      */}
    </div>
  )
}

// =============================================================================
// ROCKETRIDE ROOT
// =============================================================================

/**
 * RocketRide expects the application to be rendered inside AppLayout.
 *
 * Keep this wrapper as the single exported App component.
 */
const App: React.FC<ShellAppProps> = (props) => {
  return (
    <AppLayout>
      <div className="w-full min-h-screen bg-black text-white">
        <LogicBuildersApp {...props} />
      </div>
    </AppLayout>
  )
}

export default App