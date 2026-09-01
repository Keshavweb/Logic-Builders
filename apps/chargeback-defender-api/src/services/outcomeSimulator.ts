import { pool } from '../db/connection.js'
import { updateDisputeStatus } from '../db/disputes.js'

// ---------------------------------------------------------------------------
// Outcome simulator
//
// In a real deployment the payment processor calls POST /api/webhooks/outcome
// once it decides a submitted dispute (won / lost). There is no such processor
// here, so submitted disputes would sit at outcome=null forever and the
// Submission History win-rate / recovered totals never move.
//
// This loop plays the processor: a short while after a dispute is submitted it
// resolves it to won/lost, weighted by the AI confidence score (higher score ->
// more likely to win). Disable with SIMULATE_OUTCOMES=false.
// ---------------------------------------------------------------------------

const RESOLVE_AFTER_SECONDS = 8
const POLL_INTERVAL_MS = 10_000

async function resolvePendingOutcomes(): Promise<void> {
  try {
    const { rows } = await pool.query<{ dispute_id: string; confidence_score: number | null }>(
      `SELECT dispute_id, confidence_score
         FROM disputes
        WHERE status = 'submitted'
          AND submitted_at IS NOT NULL
          AND submitted_at < NOW() - ($1 || ' seconds')::interval`,
      [RESOLVE_AFTER_SECONDS],
    )

    for (const row of rows) {
      const score = Math.max(10, Math.min(92, row.confidence_score ?? 50))
      const outcome: 'won' | 'lost' = Math.random() * 100 < score ? 'won' : 'lost'
      await updateDisputeStatus(row.dispute_id, { status: outcome, outcome })
      console.log(`[outcome-sim] ${row.dispute_id} -> ${outcome} (confidence ${score})`)
    }
  } catch (err) {
    console.error('[outcome-sim] failed:', err instanceof Error ? err.message : err)
  }
}

export function startOutcomeSimulator(): void {
  if (process.env.SIMULATE_OUTCOMES === 'false') {
    console.log('[outcome-sim] disabled (SIMULATE_OUTCOMES=false)')
    return
  }
  console.log(
    `[outcome-sim] on — resolving submitted disputes ~${RESOLVE_AFTER_SECONDS}s after submission`,
  )
  setInterval(() => void resolvePendingOutcomes(), POLL_INTERVAL_MS)
}
