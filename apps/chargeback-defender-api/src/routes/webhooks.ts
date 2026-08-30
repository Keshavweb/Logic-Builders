import { Router } from 'express'
import { getDisputeById, updateDisputeStatus } from '../db/disputes.js'
import { outcomeSchema } from '../validation.js'

const router = Router()

// ---------- POST /api/webhooks/outcome ----------

router.post('/outcome', async (req, res) => {
  const parsed = outcomeSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const { dispute_id, outcome } = parsed.data

  try {
    const dispute = await getDisputeById(dispute_id)

    if (!dispute) {
      res.status(404).json({ error: 'Dispute not found' })
      return
    }

    // Idempotent: if already won/lost, no-op
    if (dispute.status === 'won' || dispute.status === 'lost') {
      res.json({
        dispute,
        message: `Dispute already has outcome '${dispute.outcome}'. No changes made.`,
      })
      return
    }

    // Only submitted disputes should receive outcomes
    if (dispute.status !== 'submitted') {
      res.status(409).json({
        error: `Cannot set outcome on dispute with status '${dispute.status}'. Expected 'submitted'.`,
      })
      return
    }

    const updated = await updateDisputeStatus(dispute_id, {
      status: outcome,
      outcome,
    })

    console.log(`[webhook] ${dispute_id} → ${outcome}`)
    res.json({ dispute: updated, message: `Dispute marked as ${outcome}` })
  } catch (err) {
    console.error(`[webhook] outcome failed for ${dispute_id}:`, err)
    res.status(500).json({ error: 'Failed to process outcome webhook' })
  }
})

export default router
