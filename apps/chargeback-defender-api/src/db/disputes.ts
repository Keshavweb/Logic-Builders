import { pool } from './connection.js'

// ---------- Types ----------

export type DisputeStatus =
  | 'queued'
  | 'building'
  | 'pending_review'
  | 'rejected'
  | 'submitted'
  | 'won'
  | 'lost'
  | 'failed'

export type DisputeOutcome = 'won' | 'lost'

export interface DisputeRow {
  dispute_id: string
  order_id: string
  customer_id: string
  transaction_id: string
  reason_code: string
  amount: number
  deadline: string
  status: DisputeStatus
  confidence_score: number | null
  dossier: Record<string, unknown> | null
  rejection_reason: string | null
  submitted_at: string | null
  outcome: DisputeOutcome | null
  error_message: string | null
  created_at: string
  updated_at: string
}

export interface InsertDispute {
  dispute_id: string
  order_id: string
  customer_id: string
  transaction_id: string
  reason_code: string
  amount: number
  deadline: string
}

// ---------- CRUD ----------

export async function insertDispute(dispute: InsertDispute): Promise<DisputeRow> {
  const result = await pool.query<DisputeRow>(
    `INSERT INTO disputes (dispute_id, order_id, customer_id, transaction_id, reason_code, amount, deadline, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, 'queued')
     ON CONFLICT (dispute_id) DO NOTHING
     RETURNING *`,
    [
      dispute.dispute_id,
      dispute.order_id,
      dispute.customer_id,
      dispute.transaction_id,
      dispute.reason_code,
      dispute.amount,
      dispute.deadline,
    ],
  )

  // If ON CONFLICT hit, fetch the existing record
  if (result.rows.length === 0) {
    const existing = await getDisputeById(dispute.dispute_id)
    if (!existing) throw new Error(`Failed to insert or find dispute ${dispute.dispute_id}`)
    return existing
  }

  return result.rows[0]
}

export async function getDisputeById(disputeId: string): Promise<DisputeRow | null> {
  const result = await pool.query<DisputeRow>(
    'SELECT * FROM disputes WHERE dispute_id = $1',
    [disputeId],
  )
  return result.rows[0] ?? null
}

export async function getDisputes(status?: string): Promise<DisputeRow[]> {
  if (status) {
    const result = await pool.query<DisputeRow>(
      'SELECT * FROM disputes WHERE status = $1 ORDER BY created_at DESC',
      [status],
    )
    return result.rows
  }

  const result = await pool.query<DisputeRow>(
    'SELECT * FROM disputes ORDER BY created_at DESC',
  )
  return result.rows
}

export async function updateDisputeStatus(
  disputeId: string,
  updates: {
    status: DisputeStatus
    confidence_score?: number | null
    dossier?: Record<string, unknown> | null
    error_message?: string | null
    rejection_reason?: string | null
    submitted_at?: string | null
    outcome?: DisputeOutcome | null
  },
): Promise<DisputeRow | null> {
  const setClauses: string[] = ['status = $2', 'updated_at = NOW()']
  const values: unknown[] = [disputeId, updates.status]
  let paramIndex = 3

  if (updates.confidence_score !== undefined) {
    setClauses.push(`confidence_score = $${paramIndex}`)
    values.push(updates.confidence_score)
    paramIndex++
  }
  if (updates.dossier !== undefined) {
    setClauses.push(`dossier = $${paramIndex}`)
    values.push(JSON.stringify(updates.dossier))
    paramIndex++
  }
  if (updates.error_message !== undefined) {
    setClauses.push(`error_message = $${paramIndex}`)
    values.push(updates.error_message)
    paramIndex++
  }
  if (updates.rejection_reason !== undefined) {
    setClauses.push(`rejection_reason = $${paramIndex}`)
    values.push(updates.rejection_reason)
    paramIndex++
  }
  if (updates.submitted_at !== undefined) {
    setClauses.push(`submitted_at = $${paramIndex}`)
    values.push(updates.submitted_at)
    paramIndex++
  }
  if (updates.outcome !== undefined) {
    setClauses.push(`outcome = $${paramIndex}`)
    values.push(updates.outcome)
    paramIndex++
  }

  const result = await pool.query<DisputeRow>(
    `UPDATE disputes SET ${setClauses.join(', ')} WHERE dispute_id = $1 RETURNING *`,
    values,
  )

  return result.rows[0] ?? null
}

// ---------- Stats ----------

export interface DisputeStats {
  total_processed: number
  win_count: number
  loss_count: number
  win_rate: number
  total_amount_recovered: number
}

export async function getStats(): Promise<DisputeStats> {
  const result = await pool.query<{
    total_processed: string
    win_count: string
    loss_count: string
    total_recovered: string
  }>(`
    SELECT
      COUNT(*) FILTER (WHERE status IN ('submitted', 'won', 'lost')) AS total_processed,
      COUNT(*) FILTER (WHERE outcome = 'won') AS win_count,
      COUNT(*) FILTER (WHERE outcome = 'lost') AS loss_count,
      COALESCE(SUM(amount) FILTER (WHERE outcome = 'won'), 0) AS total_recovered
    FROM disputes
  `)

  const row = result.rows[0]
  const totalProcessed = parseInt(row?.total_processed ?? '0', 10)
  const winCount = parseInt(row?.win_count ?? '0', 10)
  const lossCount = parseInt(row?.loss_count ?? '0', 10)
  const decidedCount = winCount + lossCount

  return {
    total_processed: totalProcessed,
    win_count: winCount,
    loss_count: lossCount,
    win_rate: decidedCount > 0 ? (winCount / decidedCount) * 100 : 0,
    total_amount_recovered: parseFloat(row?.total_recovered ?? '0'),
  }
}
