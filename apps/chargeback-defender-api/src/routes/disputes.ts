import { Router } from 'express'
import {
  getDisputeById,
  getDisputes,
  updateDisputeStatus,
} from '../db/disputes.js'
import { submitEvidence } from '../services/pipeline.js'
import { rejectSchema } from '../validation.js'
import type { Dossier } from '../services/mockPipeline.js'

const router = Router()

// ---------- GET /api/disputes?status=pending_review ----------

router.get('/', async (req, res) => {
  try {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined
    console.log(`[disputes] GET /api/disputes?status=${status || 'all'}`)
    const disputes = await getDisputes(status)

    // For list view, strip the full dossier to reduce payload
    const slimmed = disputes.map(({ dossier, ...rest }) => ({
      ...rest,
      has_dossier: dossier !== null,
    }))

    res.json({ disputes: slimmed })
  } catch (err) {
    console.error('[disputes] GET / failed:', err)
    res.status(500).json({ error: 'Failed to fetch disputes' })
  }
})

// ---------- GET /api/disputes/:dispute_id ----------

router.get('/:dispute_id', async (req, res) => {
  try {
    console.log(`[disputes] GET /api/disputes/${req.params.dispute_id}`)
    const dispute = await getDisputeById(req.params.dispute_id)
    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' })
      return
    }
    res.json({ dispute })
  } catch (err) {
    console.error(`[disputes] GET /${req.params.dispute_id} failed:`, err)
    res.status(500).json({ error: 'Failed to fetch dispute' })
  }
})

// ---------- POST /api/disputes/:dispute_id/approve ----------

router.post('/:dispute_id/approve', async (req, res) => {
  try {
    console.log(`[disputes] POST /api/disputes/${req.params.dispute_id}/approve`)
    const dispute = await getDisputeById(req.params.dispute_id)

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' })
      return
    }

    // Guard: only pending_review can be approved
    if (dispute.status !== 'pending_review') {
      res.status(409).json({
        error: `Cannot approve dispute with status '${dispute.status}'. Only 'pending_review' disputes can be approved.`,
      })
      return
    }

    // Call the submit pipeline
    try {
      const dossier = dispute.dossier as unknown as Dossier | null
      if (!dossier) {
        res.status(422).json({ error: 'Dispute has no dossier to submit' })
        return
      }

      const result = await submitEvidence(dossier)

      const updated = await updateDisputeStatus(dispute.dispute_id, {
        status: 'submitted',
        submitted_at: result.submitted_at,
      })

      console.log(`[disputes] ${dispute.dispute_id} → submitted`)
      res.json({ dispute: updated, message: 'Dispute approved and submitted' })
    } catch (pipelineErr) {
      // Pipeline failure — mark failed but preserve dossier for retry
      const errorMessage =
        pipelineErr instanceof Error ? pipelineErr.message : 'Submission pipeline failed'

      await updateDisputeStatus(dispute.dispute_id, {
        status: 'failed',
        error_message: errorMessage,
      })

      console.error(`[disputes] ${dispute.dispute_id} submit failed:`, errorMessage)
      res.status(502).json({
        error: 'Submission pipeline failed',
        detail: errorMessage,
      })
    }
  } catch (err) {
    console.error(`[disputes] POST /${req.params.dispute_id}/approve failed:`, err)
    res.status(500).json({ error: 'Failed to approve dispute' })
  }
})

// ---------- POST /api/disputes/:dispute_id/reject ----------

router.post('/:dispute_id/reject', async (req, res) => {
  try {
    console.log(`[disputes] POST /api/disputes/${req.params.dispute_id}/reject`)
    const dispute = await getDisputeById(req.params.dispute_id)

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' })
      return
    }

    // Guard: only pending_review can be rejected
    if (dispute.status !== 'pending_review') {
      res.status(409).json({
        error: `Cannot reject dispute with status '${dispute.status}'. Only 'pending_review' disputes can be rejected.`,
      })
      return
    }

    const parsed = rejectSchema.safeParse(req.body)
    const reason = parsed.success ? parsed.data.reason : ''

    const updated = await updateDisputeStatus(dispute.dispute_id, {
      status: 'rejected',
      rejection_reason: reason || 'No reason provided',
    })

    console.log(`[disputes] ${dispute.dispute_id} → rejected`)
    res.json({ dispute: updated, message: 'Dispute rejected' })
  } catch (err) {
    console.error(`[disputes] POST /${req.params.dispute_id}/reject failed:`, err)
    res.status(500).json({ error: 'Failed to reject dispute' })
  }
})

export default router
