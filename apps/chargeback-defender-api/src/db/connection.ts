import pg from 'pg'
import { config } from '../config.js'

const { Pool } = pg

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.DATABASE_URL.includes('sslmode=require')
    ? { rejectUnauthorized: false }
    : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
})

// ---------- Schema migration ----------

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS disputes (
  dispute_id       TEXT PRIMARY KEY,
  order_id         TEXT NOT NULL,
  customer_id      TEXT NOT NULL,
  transaction_id   TEXT NOT NULL,
  reason_code      TEXT NOT NULL,
  amount           DOUBLE PRECISION NOT NULL,
  deadline         TIMESTAMPTZ NOT NULL,
  status           TEXT NOT NULL DEFAULT 'queued'
                   CHECK (status IN (
                     'queued', 'building', 'pending_review',
                     'rejected', 'submitted', 'won', 'lost', 'failed'
                   )),
  confidence_score DOUBLE PRECISION,
  dossier          JSONB,
  rejection_reason TEXT,
  submitted_at     TIMESTAMPTZ,
  outcome          TEXT CHECK (outcome IN ('won', 'lost') OR outcome IS NULL),
  error_message    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for filtering by status (the most common query pattern)
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes (status);
`

export async function initializeDatabase(): Promise<void> {
  const client = await pool.connect()
  try {
    await client.query(SCHEMA_SQL)
    console.log('[db] Schema initialized successfully')
  } finally {
    client.release()
  }
}

export async function shutdownDatabase(): Promise<void> {
  await pool.end()
  console.log('[db] Connection pool closed')
}
