import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = process.env.PORT || 3001

const __filename = fileURLToPath(import.meta.url)
const __dirname = join(__filename, '..')
const seedDataPath = join(__dirname, 'seed-data.json')
const scenarios = JSON.parse(readFileSync(seedDataPath, 'utf8'))

// ---------------------------------------------------------------------------
// Deterministic scenario generator
// ---------------------------------------------------------------------------
// The 3 entries in seed-data.json are hand-made test cases. Any other
// transaction_id (e.g. the TXN-2xx ids from an uploaded CSV) gets a stable,
// varied scenario derived from a hash of the id so every dispute in a batch
// produces different — but reproducible — evidence signals.

const PRODUCTS = [
  'Premium Yoga Mat', 'Bluetooth Speaker', 'Smartwatch',
  'Air Fryer', 'USB-C Dock', 'Noise Cancelling Headphones',
  'Coffee Grinder', 'Portable Projector',
]
const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL']

const hashString = (value) =>
  String(value).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

const deterministicScenario = (transactionId) => {
  const hash = hashString(transactionId)

  const hasShipping = hash % 5 !== 0
  const street = 1200 + (hash % 500)
  const zip = `972${10 + (hash % 90)}`
  const billingAddress = `${street} Main Street, Portland, OR ${zip}`
  const shippingAddress = hasShipping
    ? `${street} Main Street, Portland, OR ${zip}`
    : `${street + 40} Oak Avenue, Suite ${(hash % 20) + 1}, Portland, OR ${zip}`

  const hasIp = hash % 4 !== 0
  const deviceMatch = hash % 3 === 0 ? 'unknown' : hash % 6 === 0 ? false : true

  const delivered = hash % 4 !== 3
  const deliveredDaysAgo = 1 + (hash % 9)
  const deliveredAt = delivered
    ? new Date(Date.now() - deliveredDaysAgo * 86_400_000).toISOString()
    : null
  const hasPhoto = hash % 3 === 0
  const hasSignature = hash % 2 === 0

  return {
    order: {
      transaction_id: transactionId,
      order_id: `ORD-${hash % 10000}`,
      product: PRODUCTS[hash % PRODUCTS.length],
      amount: Math.round((49.99 + (hash % 200)) * 100) / 100,
      currency: 'USD',
      order_date: new Date(Date.now() - (deliveredDaysAgo + 2) * 86_400_000).toISOString(),
      payment_method: `Visa ending ${4200 + (hash % 800)}`,
      billing_address: billingAddress,
      shipping_address: shippingAddress,
      customer_email: `customer${hash % 100}@example.com`,
    },
    session: {
      transaction_id: transactionId,
      ip_address: hasIp ? `172.16.${20 + (hash % 30)}.${42 + (hash % 50)}` : null,
      device_fingerprint: hasIp ? `fp_${hash.toString(16)}` : null,
      device_match: deviceMatch,
      login_location: hasIp ? 'Portland, OR, US' : null,
      session_start: new Date(Date.now() - (deliveredDaysAgo + 2) * 86_400_000).toISOString(),
      session_duration_seconds: 180 + (hash % 600),
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    },
    delivery: {
      transaction_id: transactionId,
      carrier: CARRIERS[hash % CARRIERS.length],
      tracking_number: `TRK${hash}${(hash * 7) % 10000}`,
      status: delivered ? 'delivered' : 'in_transit',
      delivered_at: deliveredAt,
      delivery_address: shippingAddress,
      signature_available: delivered && hasSignature,
      photo_available: delivered && hasPhoto,
      photo_url: delivered && hasPhoto
        ? 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'
        : null,
      days_since_delivery: delivered ? deliveredDaysAgo : null,
    },
  }
}

// Named scenario wins; otherwise fall back to the deterministic generator.
const resolveScenario = (transactionId) => {
  const named = scenarios[transactionId]
  const generated = deterministicScenario(transactionId)
  if (!named) return generated
  return {
    order: named.order ?? generated.order,
    session: named.session ?? generated.session,
    delivery: named.delivery ?? generated.delivery,
  }
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

app.get('/api/mock/order', (req, res) => {
  const tid = req.query.transaction_id
  if (!tid) return res.status(400).json({ error: 'transaction_id query parameter is required' })
  if (tid === 'txn_missing') return res.status(404).json({ error: 'Order not found' })
  res.json(resolveScenario(tid).order)
})

app.get('/api/mock/session', (req, res) => {
  const tid = req.query.transaction_id
  if (!tid) return res.status(400).json({ error: 'transaction_id query parameter is required' })
  if (tid === 'txn_missing') return res.status(404).json({ error: 'Session not found' })
  res.json(resolveScenario(tid).session)
})

app.get('/api/mock/delivery', (req, res) => {
  const tid = req.query.transaction_id
  if (!tid) return res.status(400).json({ error: 'transaction_id query parameter is required' })
  if (tid === 'txn_missing') return res.status(404).json({ error: 'Delivery not found' })
  res.json(resolveScenario(tid).delivery)
})

// Prior dispute history for a customer — deterministic from the customer_id.
app.get('/api/mock/customer', (req, res) => {
  const customerId = req.query.customer_id
  if (!customerId) return res.status(400).json({ error: 'customer_id query parameter is required' })
  if (customerId === 'cust_missing') return res.status(404).json({ error: 'Customer not found' })

  const hash = hashString(customerId)
  const priorCount = hash % 4 // 0..3
  const outcomes = Array.from({ length: priorCount }, (_, i) =>
    (hash >> i) & 1 ? 'won' : 'lost',
  )

  res.json({
    customer_id: customerId,
    prior_disputes_count: priorCount,
    prior_outcomes: outcomes,
    account_age_days: 90 + (hash % 900),
    email: `customer${hash % 100}@example.com`,
  })
})

app.post('/api/mock/stripe-submit', (req, res) => {
  const { dispute_id } = req.body ?? {}
  if (!dispute_id) return res.status(400).json({ error: 'dispute_id is required' })
  res.json({
    dispute_id,
    submitted: true,
    submitted_at: new Date().toISOString(),
    processor_reference: 'mock_ref_' + Math.random().toString(36).slice(2),
    status: 'evidence_submitted',
  })
})

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' })
})

app.listen(PORT, () => {
  console.log(`[mock-services] Running on http://localhost:${PORT}`)
})
