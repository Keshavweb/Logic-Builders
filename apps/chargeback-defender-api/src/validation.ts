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
    .max(50, 'Maximum 50 disputes per batch'),
})

export type ValidatedBatchRow = z.infer<typeof batchRowSchema>

// ---------- Reject schema ----------

export const rejectSchema = z.object({
  reason: z.string().optional().default(''),
})

// ---------- Webhook outcome schema ----------

export const outcomeSchema = z.object({
  dispute_id: z.string().min(1, 'dispute_id is required'),
  outcome: z.enum(['won', 'lost']),
})
