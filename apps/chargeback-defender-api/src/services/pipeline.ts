import { config } from '../config.js'
import type { ValidatedBatchRow } from '../validation.js'
import { dossierSchema } from '../validation.js'
import { mockBuildEvidence, mockSubmitEvidence } from './mockPipeline.js'
import {
  assembleDossier,
  computeConfidence,
  computeSignals,
  fetchEvidenceData,
  type Dossier,
  type EvidenceData,
  type SubmitResult,
} from './scoring.js'

// ---------------------------------------------------------------------------
// Evidence builder
// ---------------------------------------------------------------------------
//
// The deterministic work (backing-service lookups, signal extraction,
// confidence scoring, profile assembly) happens here in code. The local
// llama3.2 model (via Ollama) is asked only to draft the prose evidence
// letter from the assembled facts — the one job it does acceptably.
//
// NOTE: the RocketRide `.pipe` files in ../../pipelines describe the same flow
// visually and would run against a LOCAL RocketRide engine, but the configured
// engine here is RocketRide staging (cloud), which cannot reach this machine's
// localhost Ollama / mock-services. So we call both directly over HTTP.

const LETTER_SYSTEM_PROMPT = [
  "You are a chargeback dispute analyst writing to a card payment processor's dispute-resolution team.",
  'The user message is a JSON object describing ONE dispute. It already contains every fact you may use',
  '(dispute, reason_code, amount, the computed confidence_score/label, the evidence signals, the raw',
  'order/session/delivery/customer records, and a missing_evidence list).',
  '',
  'Write a firm, professional evidence letter of 150-300 words that:',
  '1. Identifies the dispute_id and the reason_code being contested.',
  '2. Cites ONLY the specific favorable signals that are actually true in the input (delivery confirmation',
  "   and date, delivery photo, signature, device match, address match, the customer's prior dispute count).",
  '3. If missing_evidence is non-empty, briefly acknowledges the gaps; when confidence_label is',
  '   "weak evidence" or "insufficient evidence", request a manual review instead of asserting a win.',
  "4. Tailors the argument to reason_code: 'product_not_received' -> lead with delivery proof;",
  "   'unauthorized_transaction' -> lead with device/IP/address match and account history;",
  "   'duplicate_charge' -> note this is a single distinct transaction with no duplicate settlement found.",
  '5. Closes by requesting resolution in the merchant\'s favour.',
  '',
  'Invent nothing that is not in the input. No markdown, no backticks.',
  'Return ONLY a JSON object: {"evidence_letter": "<full letter>", "confidence_explanation": "<one sentence>"}',
].join('\n')

export async function buildEvidence(
  row: ValidatedBatchRow,
  index: number,
): Promise<Dossier> {
  if (config.USE_MOCK_PIPELINE) {
    return mockBuildEvidence(row, index)
  }

  const data = await fetchEvidenceData(row)

  let llm = { letter: '', explanation: '' }
  try {
    llm = await draftLetter(row, data)
  } catch (err) {
    console.error(
      `[pipeline] draftLetter failed for ${row.dispute_id}, using fallback letter:`,
      err instanceof Error ? err.message : err,
    )
  }

  const dossier = assembleDossier(row, data, llm)
  return dossierSchema.parse(dossier) as unknown as Dossier
}

// ---------------------------------------------------------------------------
// LLM letter draft — Gemini if GEMINI_API_KEY is set, else local Ollama
// ---------------------------------------------------------------------------

async function draftLetter(
  row: ValidatedBatchRow,
  data: EvidenceData,
): Promise<{ letter: string; explanation: string }> {
  const { signals } = computeSignals(data)
  const { score, label } = computeConfidence(signals, row.reason_code)

  const factPayload = {
    dispute_id: row.dispute_id,
    reason_code: row.reason_code,
    amount: typeof row.amount === 'string' ? parseFloat(row.amount) : row.amount,
    currency: (data.order?.currency as string) ?? 'USD',
    confidence_score: score,
    confidence_label: label,
    signals,
    missing_evidence: data.lookupErrors,
    order: data.order,
    session: data.session,
    delivery: data.delivery,
    customer: data.customer,
  }

  const content = config.GEMINI_API_KEY
    ? await callGemini(row.dispute_id, factPayload)
    : await callOllama(row.dispute_id, factPayload)

  const parsed = extractJsonObject(content)
  return {
    letter: String(parsed?.evidence_letter ?? '').trim(),
    explanation: String(parsed?.confidence_explanation ?? '').trim(),
  }
}

async function callGemini(disputeId: string, factPayload: unknown): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 45_000)
  try {
    console.log(`[pipeline] draftLetter: calling Gemini for ${disputeId}...`)
    const url = `https://generativelanguage.googleapis.com/v1/models/${config.GEMINI_MODEL}:generateContent?key=${config.GEMINI_API_KEY}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: LETTER_SYSTEM_PROMPT }] },
        contents: [{ role: 'user', parts: [{ text: JSON.stringify(factPayload) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
    })
    if (!res.ok) {
      throw new Error(`Gemini responded ${res.status}: ${(await res.text()).slice(0, 200)}`)
    }
    const body = (await res.json()) as any
    console.log(`[pipeline] draftLetter: Gemini responded for ${disputeId}`)
    return body?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join('') ?? ''
  } finally {
    clearTimeout(timeout)
  }
}

async function callOllama(disputeId: string, factPayload: unknown): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 60_000)
  try {
    console.log(`[pipeline] draftLetter: calling Ollama for ${disputeId}...`)
    const res = await fetch(`${config.OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: config.OLLAMA_MODEL,
        stream: false,
        format: 'json',
        options: { temperature: 0.2 },
        messages: [
          { role: 'system', content: LETTER_SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(factPayload) },
        ],
      }),
    })
    if (!res.ok) throw new Error(`Ollama responded ${res.status}`)
    const body = (await res.json()) as { message?: { content?: string } }
    console.log(`[pipeline] draftLetter: Ollama responded for ${disputeId}`)
    return body.message?.content ?? ''
  } finally {
    clearTimeout(timeout)
  }
}

// Pull the first balanced JSON object out of a model response that may wrap it
// in prose or markdown fences.
function extractJsonObject(raw: string): any | null {
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    /* fall through */
  }
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(raw.slice(start, end + 1))
    } catch {
      /* give up */
    }
  }
  return null
}

// ---------------------------------------------------------------------------
// Submit evidence to the payment processor (Stripe stub)
// ---------------------------------------------------------------------------

export async function submitEvidence(
  disputeId: string,
  dossier: Dossier,
): Promise<SubmitResult> {
  if (config.USE_MOCK_PIPELINE) {
    return mockSubmitEvidence(dossier)
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(`${config.MOCK_SERVICES_URL}/api/mock/stripe-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        dispute_id: disputeId,
        evidence_letter: dossier.evidence_letter,
        confidence_score: dossier.confidence_score,
      }),
    })

    if (!res.ok) throw new Error(`stripe-submit responded ${res.status}`)
    const body = (await res.json()) as { submitted_at?: string; status?: string }

    return {
      success: body.status !== 'submission_failed',
      submitted_at: body.submitted_at ?? new Date().toISOString(),
    }
  } finally {
    clearTimeout(timeout)
  }
}
