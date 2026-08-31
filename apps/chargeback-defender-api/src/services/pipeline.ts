import fs from 'node:fs/promises'
import path from 'node:path'
import { RocketRideClient } from 'rocketride'
import { config } from '../config.js'
import type { ValidatedBatchRow } from '../validation.js'
import {
  mockBuildEvidence,
  mockSubmitEvidence,
  type Dossier,
  type SubmitResult,
  type EvidenceItem,
} from './mockPipeline.js'

// ---------- Client Factory ----------

function getClient() {
  return new RocketRideClient({
    uri: config.ROCKETRIDE_URI,
    auth: config.ROCKETRIDE_APIKEY,
  })
}

// ---------- Evidence builder ----------

export async function buildEvidence(
  row: ValidatedBatchRow,
  index: number,
): Promise<Dossier> {
  if (config.USE_MOCK_PIPELINE) {
    return mockBuildEvidence(row, index)
  }

  const client = getClient()
  await client.connect()
  
  // Read and override project_id to allow concurrent runs
  const pipeJson = await fs.readFile(
    path.join(process.cwd(), '../../pipelines/chargeback-evidence-builder.pipe'),
    'utf-8'
  )
  const pipeline = JSON.parse(pipeJson)
  pipeline.project_id = `ev-${row.dispute_id}-${Date.now()}`

  console.log(`[pipeline] buildEvidence: Calling RocketRide for ${row.dispute_id}...`)
  const { token } = await client.use({ pipeline })
  
  try {
    const result = await client.send(token, JSON.stringify(row), {
      objinfo: { name: `dispute-${row.dispute_id}.json` },
      mimetype: 'text/plain',
    })
    console.log(`[pipeline] buildEvidence: RocketRide responded for ${row.dispute_id}`)
    return parseDossier(result)
  } finally {
    await client.terminate(token) // REQUIRED
  }
}

// ---------- Submit to payment processor ----------

export async function submitEvidence(dossier: Dossier): Promise<SubmitResult> {
  if (config.USE_MOCK_PIPELINE) {
    return mockSubmitEvidence(dossier)
  }

  const client = getClient()
  await client.connect()
  
  const pipeJson = await fs.readFile(
    path.join(process.cwd(), '../../pipelines/chargeback-submit-and-log.pipe'),
    'utf-8'
  )
  const pipeline = JSON.parse(pipeJson)
  pipeline.project_id = `sub-${Date.now()}`

  console.log(`[pipeline] submitEvidence: Calling RocketRide...`)
  const { token } = await client.use({ pipeline })
  
  try {
    const result = await client.send(token, JSON.stringify(dossier), {
      objinfo: { name: `submit-${Date.now()}.json` },
      mimetype: 'text/plain',
    })
    
    // The pipeline returns answers in an array if response_answers is used
    const answerStr = result?.answers?.[0] || '{}'
    let answerObj: any = {}
    try { answerObj = JSON.parse(answerStr) } catch (e) {}

    console.log(`[pipeline] submitEvidence: RocketRide answered with status: ${answerObj.status || 'unknown'}`)

    return {
      success: answerObj.status !== 'submission_failed',
      submitted_at: answerObj.submitted_at || new Date().toISOString(),
    }
  } finally {
    await client.terminate(token) // REQUIRED
  }
}

// ---------- Defensive dossier parser (for real pipeline responses) ----------

function parseDossier(raw: unknown): Dossier {
  const rawObj = raw as any
  const answerStr = rawObj?.answers?.[0] || '{}'
  let obj: any = {}
  try { obj = JSON.parse(answerStr) } catch (e) {
    if (typeof raw === 'string') {
      try { obj = JSON.parse(raw) } catch (e) {}
    } else {
      obj = rawObj
    }
  }
  
  console.log(`[pipeline] parseDossier: Parsed signals`, obj.signals)
  
  const signals = (obj.signals as Record<string, unknown>) || {}
  
  const supporting: EvidenceItem[] = []
  if (signals.delivery_confirmed) supporting.push({ label: 'Delivery confirmed' })
  if (signals.delivery_photo_available) supporting.push({ label: 'Delivery photo available' })
  if (signals.device_match) supporting.push({ label: 'Device verified' })
  if (signals.address_match) supporting.push({ label: 'Address matched' })
  
  const missing = (Array.isArray(obj.missing_evidence) ? obj.missing_evidence : []).map((m: any) => ({ label: String(m) }))

  return {
    confidence_score: typeof obj.confidence_score === 'number' ? obj.confidence_score : 0,
    customer_profile: {
      order_details: 'Order data pulled from CRM',
      payment_info: 'Payment info pulled from gateway',
      delivery_status: signals.delivery_confirmed ? 'Delivered' : 'Unknown',
      delivery_timestamp: null,
      delivery_address: null,
      ip_address: null,
      device_match: signals.device_match === true ? 'yes' : signals.device_match === false ? 'no' : 'unknown',
      delivery_photo_url: signals.delivery_photo_available ? 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80' : null,
      signature: null,
      prior_history: {
        count: Number(signals.prior_disputes_count ?? 0),
        outcomes: []
      }
    },
    evidence_analysis: {
      supporting,
      missing,
      contradictory: [],
      confidence_explanation: String(obj.confidence_label ?? 'Score based on signals.'),
    },
    evidence_letter: String(obj.evidence_letter ?? 'No evidence letter generated.'),
  }
}
