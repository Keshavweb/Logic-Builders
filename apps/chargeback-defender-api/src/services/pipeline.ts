import { config } from '../config.js'
import type { ValidatedBatchRow } from '../validation.js'
import {
  mockBuildEvidence,
  mockSubmitEvidence,
  type Dossier,
  type SubmitResult,
} from './mockPipeline.js'

// ---------- Evidence builder ----------

export async function buildEvidence(
  row: ValidatedBatchRow,
  index: number,
): Promise<Dossier> {
  if (config.USE_MOCK_PIPELINE) {
    return mockBuildEvidence(row, index)
  }

  // Real RocketRide SDK call — stubbed with terminate() in finally
  // TODO: Install and import RocketRide client from .rocketride/client/rocketride.tgz
  //
  // const { RocketRideClient } = await import('rocketride')
  // const client = new RocketRideClient({
  //   uri: config.ROCKETRIDE_URI,
  //   auth: config.ROCKETRIDE_APIKEY,
  // })
  // await client.connect()
  // const { token } = await client.use({
  //   filepath: 'pipelines/chargeback-evidence-builder.pipe',
  // })
  // try {
  //   const result = await client.send(token, JSON.stringify(row), {
  //     objinfo: { name: `dispute-${row.dispute_id}.json` },
  //     mimetype: 'application/json',
  //   })
  //   // Defensive parsing — treat pipeline response as untrusted
  //   return parseDossier(result)
  // } finally {
  //   await client.terminate(token) // REQUIRED: always called, success or failure
  // }

  throw new Error(
    'Real pipeline not configured. Set USE_MOCK_PIPELINE=true or install the RocketRide SDK.',
  )
}

// ---------- Submit to payment processor ----------

export async function submitEvidence(dossier: Dossier): Promise<SubmitResult> {
  if (config.USE_MOCK_PIPELINE) {
    return mockSubmitEvidence(dossier)
  }

  // Real RocketRide SDK call — stubbed with terminate() in finally
  // TODO: Install and import RocketRide client from .rocketride/client/rocketride.tgz
  //
  // const { RocketRideClient } = await import('rocketride')
  // const client = new RocketRideClient({
  //   uri: config.ROCKETRIDE_URI,
  //   auth: config.ROCKETRIDE_APIKEY,
  // })
  // await client.connect()
  // const { token } = await client.use({
  //   filepath: 'pipelines/chargeback-submit-and-log.pipe',
  // })
  // try {
  //   const result = await client.send(token, JSON.stringify(dossier), {
  //     objinfo: { name: `submit-${Date.now()}.json` },
  //     mimetype: 'application/json',
  //   })
  //   return {
  //     success: true,
  //     submitted_at: result?.submitted_at ?? new Date().toISOString(),
  //   }
  // } finally {
  //   await client.terminate(token) // REQUIRED: always called, success or failure
  // }

  throw new Error(
    'Real pipeline not configured. Set USE_MOCK_PIPELINE=true or install the RocketRide SDK.',
  )
}

// ---------- Defensive dossier parser (for real pipeline responses) ----------

// function parseDossier(raw: unknown): Dossier {
//   const obj = (typeof raw === 'string' ? JSON.parse(raw) : raw) as Record<string, unknown>
//   return {
//     confidence_score: typeof obj.confidence_score === 'number' ? obj.confidence_score : 0,
//     customer_profile: {
//       order_details: String(obj.customer_profile?.order_details ?? 'Not available'),
//       payment_info: String(obj.customer_profile?.payment_info ?? 'Not available'),
//       delivery_status: String(obj.customer_profile?.delivery_status ?? 'Not available'),
//       delivery_timestamp: obj.customer_profile?.delivery_timestamp ?? null,
//       delivery_address: obj.customer_profile?.delivery_address ?? null,
//       ip_address: obj.customer_profile?.ip_address ?? null,
//       device_match: ['yes','no','unknown'].includes(obj.customer_profile?.device_match)
//         ? obj.customer_profile.device_match : 'unknown',
//       delivery_photo_url: obj.customer_profile?.delivery_photo_url ?? null,
//       signature: obj.customer_profile?.signature ?? null,
//       prior_history: {
//         count: Number(obj.customer_profile?.prior_history?.count ?? 0),
//         outcomes: Array.isArray(obj.customer_profile?.prior_history?.outcomes)
//           ? obj.customer_profile.prior_history.outcomes : [],
//       },
//     },
//     evidence_analysis: {
//       supporting: Array.isArray(obj.evidence_analysis?.supporting)
//         ? obj.evidence_analysis.supporting : [],
//       missing: Array.isArray(obj.evidence_analysis?.missing)
//         ? obj.evidence_analysis.missing : [],
//       contradictory: Array.isArray(obj.evidence_analysis?.contradictory)
//         ? obj.evidence_analysis.contradictory : [],
//       confidence_explanation: String(obj.evidence_analysis?.confidence_explanation ?? ''),
//     },
//     evidence_letter: String(obj.evidence_letter ?? 'No evidence letter generated.'),
//   }
// }
