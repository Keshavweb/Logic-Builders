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

import {
  processBatchDispute,
  defaultDisputes,
} from './services/disputeService'

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

const LogicBuildersApp: React.FC<ShellAppProps> = ({
  isConnected,
  identity,
}) => {
  const [screen, setScreen] = useState<ScreenName>('front')

  const [uploadedRows, setUploadedRows] = useState<BatchRow[]>([])

  const [batchProgress, setBatchProgress] = useState<BatchProgress[]>([])

  const [disputes, setDisputes] =
    useState<DisputeRecord[]>(defaultDisputes)

  const [toast, setToast] = useState<string | null>(null)

  React.useEffect(() => {
    const fetchDisputes = async () => {
      try {
        const baseUrl = process.env.PUBLIC_API_BASE_URL || 'http://localhost:4000'
        const res = await fetch(`${baseUrl}/api/disputes`)
        if (res.ok) {
          const { disputes: realDisputes } = await res.json()
          if (realDisputes && realDisputes.length > 0) {
            setDisputes(realDisputes.map((updated: any) => ({
              id: updated.dispute_id,
              customerId: updated.customer_id,
              product: 'Disputed Product',
              amount: updated.amount,
              reasonCode: updated.reason_code,
              deadline: updated.deadline,
              confidence: updated.confidence_score ?? 0,
              status: updated.status,
              outcome: updated.outcome ?? 'pending',
              profile: updated.dossier?.customer_profile,
              evidenceAnalysis: updated.dossier?.evidence_analysis,
              evidenceLetter: updated.dossier?.evidence_letter,
              submittedAt: updated.submitted_at,
              rejectReason: updated.rejection_reason
            })))
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
      const baseUrl = process.env.PUBLIC_API_BASE_URL || 'http://localhost:4000'
      const response = await fetch(`${baseUrl}/api/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disputes: uploadedRows }),
      })

      if (!response.ok) {
        throw new Error('Batch submission failed')
      }

      // Start polling
      const pollInterval = setInterval(async () => {
        try {
          const res = await fetch(`${baseUrl}/api/disputes`)
          if (!res.ok) return
          const { disputes: updatedDisputes } = await res.json()

          let allDone = true

          setBatchProgress((prev) => {
            return prev.map((entry) => {
              const updated = updatedDisputes.find((d: any) => d.dispute_id === entry.disputeId)
              if (!updated) return entry

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

          setDisputes((prev) => {
            const newDisputes = [...prev]
            updatedDisputes.forEach((updated: any) => {
              if (updated.status === 'pending_review') {
                const idx = newDisputes.findIndex((d) => d.id === updated.dispute_id)
                const mapped: DisputeRecord = {
                  id: updated.dispute_id,
                  customerId: updated.customer_id,
                  product: 'Disputed Product',
                  amount: updated.amount,
                  reasonCode: updated.reason_code,
                  deadline: updated.deadline,
                  confidence: updated.confidence_score ?? 0,
                  status: 'pending_review',
                  outcome: 'pending',
                  profile: updated.dossier?.customer_profile,
                  evidenceAnalysis: updated.dossier?.evidence_analysis,
                  evidenceLetter: updated.dossier?.evidence_letter,
                }
                if (idx >= 0) {
                  newDisputes[idx] = mapped
                } else {
                  newDisputes.unshift(mapped)
                }
              }
            })
            return newDisputes
          })

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
      const baseUrl = process.env.PUBLIC_API_BASE_URL || 'http://localhost:4000'
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
      const baseUrl = process.env.PUBLIC_API_BASE_URL || 'http://localhost:4000'
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