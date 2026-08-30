import { Router } from 'express'
import pLimit from 'p-limit'
import { config } from '../config.js'
import { insertDispute, updateDisputeStatus } from '../db/disputes.js'
import { buildEvidence } from '../services/pipeline.js'
import { batchRequestSchema } from '../validation.js'

const router = Router()
const limit = pLimit(config.CONCURRENCY_LIMIT)

router.post('/', async (req, res) => {
  // Validate request body
  const parsed = batchRequestSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({
      error: 'Validation failed',
      details: parsed.error.flatten().fieldErrors,
    })
    return
  }

  const { disputes } = parsed.data

  // Step 1: Insert all rows as 'queued' immediately
  const insertedRows = []
  const insertErrors = []

  for (const row of disputes) {
    try {
      const inserted = await insertDispute({
        dispute_id: row.dispute_id,
        order_id: row.order_id,
        customer_id: row.customer_id,
        transaction_id: row.transaction_id,
        reason_code: row.reason_code,
        amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
        deadline: row.deadline,
      })
      insertedRows.push(inserted)
    } catch (err) {
      insertErrors.push({
        dispute_id: row.dispute_id,
        error: err instanceof Error ? err.message : 'Insert failed',
      })
    }
  }

  // Step 2: Return immediately with created records
  res.status(201).json({
    created: insertedRows,
    errors: insertErrors,
    message: `${insertedRows.length} disputes queued, ${insertErrors.length} failed to insert`,
  })

  // Step 3: Kick off evidence building asynchronously with concurrency limit
  const buildPromises = insertedRows.map((row, index) =>
    limit(async () => {
      try {
        // Mark as 'building'
        await updateDisputeStatus(row.dispute_id, { status: 'building' })

        // Call pipeline
        const dossier = await buildEvidence(
          {
            dispute_id: row.dispute_id,
            order_id: row.order_id,
            customer_id: row.customer_id,
            transaction_id: row.transaction_id,
            reason_code: row.reason_code,
            amount: row.amount,
            deadline: typeof row.deadline === 'object'
              ? (row.deadline as Date).toISOString()
              : String(row.deadline),
          },
          index,
        )

        // Mark as 'pending_review' with dossier
        await updateDisputeStatus(row.dispute_id, {
          status: 'pending_review',
          confidence_score: dossier.confidence_score,
          dossier: dossier as unknown as Record<string, unknown>,
        })

        console.log(`[batch] ${row.dispute_id} → pending_review (confidence: ${dossier.confidence_score})`)
      } catch (err) {
        // Individual failure — don't stop others
        const errorMessage = err instanceof Error ? err.message : 'Unknown error'
        await updateDisputeStatus(row.dispute_id, {
          status: 'failed',
          error_message: errorMessage,
        })
        console.error(`[batch] ${row.dispute_id} → failed: ${errorMessage}`)
      }
    }),
  )

  // Fire-and-forget — don't block the response
  Promise.allSettled(buildPromises).then(() => {
    console.log(`[batch] All ${insertedRows.length} disputes processed`)
  })
})

export default router
