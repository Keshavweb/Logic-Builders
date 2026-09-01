import { z } from 'zod'

// ---------- Batch row schema ----------

export const batchRowSchema = z.object({
  dispute_id: z.string().min(1, 'dispute_id is required'),
  order_id: z.string().min(1, 'order_id is required'),
  customer_id: z.string().min(1, 'customer_id is required'),
  transaction_id: z.string().min(1, 'transaction_id is required'),
  reason_code: z.string().min(1, 'reason_code is required'),
  amount: z.union([z.number(), z.string().transform(Number)])
    .pipe(z.number().positive('amount must be positive')),
  deadline: z.string().min(1, 'deadline is required').refine(
    (val) => !isNaN(new Date(val).getTime()),
    'deadline must be a valid date',
  ),
})

export const batchRequestSchema = z.object({
  disputes: z
    .array(batchRowSchema)
    .min(1, 'At least one dispute row is required')
    .max(500, 'Maximum 500 disputes per batch'),
})

export type ValidatedBatchRow = z.infer<typeof batchRowSchema>

// ---------- Dossier schema (pipeline output guard) ----------

const evidenceItemSchema = z.object({
  label: z.string(),
  detail: z.string().optional(),
})

export const dossierSchema = z.object({
  confidence_score: z.number().min(0).max(100),
  confidence_label: z.string().min(1).max(40),
  missing_evidence: z.array(z.string()),
  customer_profile: z.object({
    orderDetails: z.string().nullable(),
    paymentInfo: z.string().nullable(),
    deliveryStatus: z.string().nullable(),
    deliveryTimestamp: z.string().nullable(),
    deliveryAddress: z.string().nullable(),
    ipAddress: z.string().nullable(),
    deviceMatch: z.enum(['yes', 'no', 'unknown']),
    deliveryPhotoUrl: z.string().nullable(),
    signature: z.string().nullable(),
    priorHistory: z.object({
      count: z.number().int().min(0),
      outcomes: z.array(z.string()),
    }),
  }),
  evidence_analysis: z.object({
    supporting: z.array(evidenceItemSchema),
    missing: z.array(evidenceItemSchema),
    contradictory: z.array(evidenceItemSchema),
    confidenceExplanation: z.string(),
  }),
  evidence_letter: z.string().min(50),
})

// ---------- Reject schema ----------

export const rejectSchema = z.object({
  reason: z.string().optional().default(''),
})

// ---------- Webhook outcome schema ----------

export const outcomeSchema = z.object({
  dispute_id: z.string().min(1, 'dispute_id is required'),
  outcome: z.enum(['won', 'lost']),
})
