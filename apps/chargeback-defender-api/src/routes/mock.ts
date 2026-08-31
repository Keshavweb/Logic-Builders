import { Router } from 'express'

const router = Router()

// ---------- Mock Order API ----------
// Called by pipeline's order_api tool_http_request node

router.get('/order', (req, res) => {
  const transactionId = req.query.transaction_id as string

  if (!transactionId) {
    res.status(400).json({ error: 'transaction_id query parameter is required' })
    return
  }

  // Generate deterministic mock data from transaction_id
  const hash = transactionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

  res.json({
    transaction_id: transactionId,
    order_id: `ORD-${hash % 10000}`,
    product: ['Premium Yoga Mat', 'Bluetooth Speaker', 'Smartwatch', 'Air Fryer', 'USB-C Dock'][hash % 5],
    amount: 49.99 + (hash % 200),
    currency: 'USD',
    order_date: '2026-08-25T10:30:00.000Z',
    payment_method: `Visa ending ••${4200 + (hash % 800)}`,
    billing_address: `${1200 + hash % 500} Main Street, Portland, OR 972${10 + (hash % 90)}`,
    shipping_address: hash % 5 === 0
      ? null
      : `${1200 + hash % 500} Oak Avenue, Suite ${(hash % 20) + 1}, Portland, OR 972${10 + (hash % 90)}`,
    customer_email: `customer${hash % 100}@example.com`,
  })
})

// ---------- Mock Sessions API ----------
// Called by pipeline's sessions_api tool_http_request node

router.get('/session', (req, res) => {
  const transactionId = req.query.transaction_id as string

  if (!transactionId) {
    res.status(400).json({ error: 'transaction_id query parameter is required' })
    return
  }

  const hash = transactionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const hasIp = hash % 4 !== 0
  const deviceMatch = hash % 3 === 0 ? 'unknown' : hash % 5 === 0 ? false : true

  res.json({
    transaction_id: transactionId,
    ip_address: hasIp ? `172.16.${20 + (hash % 30)}.${42 + (hash % 50)}` : null,
    device_fingerprint: hasIp ? `fp_${hash.toString(16)}` : null,
    device_match: deviceMatch,
    login_location: hasIp ? 'Portland, OR, US' : null,
    session_start: '2026-08-25T10:28:00.000Z',
    session_duration_seconds: 180 + (hash % 600),
    user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
  })
})

// ---------- Mock Delivery API ----------
// Called by pipeline's delivery_api tool_http_request node

router.get('/delivery', (req, res) => {
  const transactionId = req.query.transaction_id as string

  if (!transactionId) {
    res.status(400).json({ error: 'transaction_id query parameter is required' })
    return
  }

  const hash = transactionId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  const delivered = hash % 4 !== 3
  const hasPhoto = hash % 3 === 0
  const hasSignature = hash % 2 === 0

  res.json({
    transaction_id: transactionId,
    carrier: ['UPS', 'FedEx', 'USPS', 'DHL'][hash % 4],
    tracking_number: `TRK${hash}${(hash * 7) % 10000}`,
    status: delivered ? 'delivered' : 'in_transit',
    delivered_at: delivered ? '2026-08-27T14:55:00.000Z' : null,
    delivery_address: `${1200 + hash % 500} Oak Avenue, Portland, OR`,
    signature_available: hasSignature,
    photo_available: hasPhoto,
    photo_url: hasPhoto
      ? 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'
      : null,
    days_since_delivery: delivered ? 3 : null,
  })
})

// ---------- Mock Stripe Submit ----------
// Called by pipeline's stripe_submit tool_http_request node

router.post('/stripe-submit', (req, res) => {
  const { dispute_id } = req.body ?? {}

  if (!dispute_id) {
    res.status(400).json({ error: 'dispute_id is required in request body' })
    return
  }

  // Simulate Stripe test mode response
  const processorRef = `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  console.log(`[mock/stripe] Evidence submitted for ${dispute_id} → ref ${processorRef}`)

  res.json({
    dispute_id,
    processor_reference: processorRef,
    status: 'evidence_submitted',
    submitted_at: new Date().toISOString(),
    test_mode: true,
    message: 'Evidence successfully submitted to Stripe test mode',
  })
})

export default router
