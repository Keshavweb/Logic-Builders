import type { ValidatedBatchRow } from '../validation.js'
import {
  assembleDossier,
  fakeEvidenceData,
  type Dossier,
  type SubmitResult,
} from './scoring.js'

// Re-export the shared shapes so existing importers keep working.
export type {
  Dossier,
  SubmitResult,
  CustomerProfile,
  EvidenceAnalysis,
  EvidenceItem,
} from './scoring.js'

// ---------- Helpers ----------

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

const randomBetween = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min

// ---------- Mock evidence builder ----------
//
// Used when USE_MOCK_PIPELINE=true. Produces the exact same Dossier shape as the
// real path by running the shared scoring code over deterministic fake data
// instead of real backing-service lookups, and skipping the LLM letter draft
// (the fallback letter is used).

export async function mockBuildEvidence(
  row: ValidatedBatchRow,
  index: number,
): Promise<Dossier> {
  await wait(randomBetween(400, 1200))

  // Deliberate failure for testing the error path
  if (row.customer_id === 'CUST-9039') {
    throw new Error('Profile build failed: missing customer metadata')
  }

  const data = fakeEvidenceData(row, index)
  return assembleDossier(row, data, { letter: '', explanation: '' })
}

// ---------- Mock submit ----------

export async function mockSubmitEvidence(_dossier: Dossier): Promise<SubmitResult> {
  await wait(randomBetween(300, 800))
  return {
    success: true,
    submitted_at: new Date().toISOString(),
  }
}
