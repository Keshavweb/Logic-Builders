import { Router } from 'express'

// ---------------------------------------------------------------------------
// Mock backing services — order / session / delivery / customer / stripe stub.
//
// Mirrors apps/mock-services/server.js so the API is self-contained when
// hosted (no second service to deploy). Data is deterministic per id, with a
// few named scenarios kept as overrides.
// ---------------------------------------------------------------------------

const router = Router()

const NAMED: Record<string, any> = {
  txn_clean: {
    order: {
      order_id: 'ORD-CLEAN', product: 'Premium Coffee Maker', amount: 150, currency: 'USD',
      payment_method: 'Visa ending 4242',
      billing_address: '123 Main St, Portland, OR', shipping_address: '123 Main St, Portland, OR',
      customer_email: 'clean@example.com',
    },
    session: { ip_address: '172.16.0.1', device_fingerprint: 'fp_clean', device_match: true, login_location: 'Portland, OR, US' },
    delivery: { status: 'delivered', delivered_at: '2026-08-27T14:55:00.000Z', signature_available: true, photo_available: true, carrier: 'UPS', days_since_delivery: 3 },
  },
  txn_thin: {
    order: {
      order_id: 'ORD-THIN', product: 'Digital Gift Card', amount: 25, currency: 'USD',
      payment_method: 'Mastercard ending 1111',
      billing_address: '456 Oak Ave, Seattle, WA', shipping_address: null, customer_email: 'thin@example.com',
    },
    session: { ip_address: null, device_fingerprint: null, device_match: false, login_location: null },
    delivery: { status: 'delivered', delivered_at: '2026-08-26T11:05:00.000Z', signature_available: false, photo_available: false, carrier: 'Email Delivery', days_since_delivery: 6 },
  },
  txn_repeat: {
    order: {
      order_id: 'ORD-REPEAT', product: 'Gaming Headset', amount: 80, currency: 'USD',
      payment_method: 'Amex ending 9999',
      billing_address: '789 Pine Rd, Austin, TX', shipping_address: '789 Pine Rd, Austin, TX', customer_email: 'repeat@example.com',
    },
    session: { ip_address: '10.0.0.5', device_fingerprint: 'fp_repeat', device_match: true, login_location: 'Austin, TX, US' },
    delivery: { status: 'delivered', delivered_at: '2026-08-22T16:20:00.000Z', signature_available: false, photo_available: true, carrier: 'FedEx', days_since_delivery: 10 },
  },
}

const PRODUCTS = [
  'Premium Yoga Mat', 'Bluetooth Speaker', 'Smartwatch', 'Air Fryer', 'USB-C Dock',
  'Noise Cancelling Headphones', 'Coffee Grinder', 'Portable Projector',
]
const CARRIERS = ['UPS', 'FedEx', 'USPS', 'DHL']

const hashString = (v: string) =>
  String(v).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)

function deterministicScenario(transactionId: string) {
  const hash = hashString(transactionId)
  const hasShipping = hash % 5 !== 0
  const street = 1200 + (hash % 500)
  const zip = `972${10 + (hash % 90)}`
  const billing = `${street} Main Street, Portland, OR ${zip}`
  const shipping = hasShipping
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
      billing_address: billing,
      shipping_address: shipping,
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
      delivery_address: shipping,
      signature_available: delivered && hasSignature,
      photo_available: delivered && hasPhoto,
      photo_url: delivered && hasPhoto
        ? 'https://images.unsplash.com/photo-1521572267360-ee0c2909d518?auto=format&fit=crop&w=900&q=80'
        : null,
      days_since_delivery: delivered ? deliveredDaysAgo : null,
    },
  }
}

const resolve = (tid: string) => {
  const named = NAMED[tid]
  const generated = deterministicScenario(tid)
  if (!named) return generated
  return {
    order: { transaction_id: tid, ...(named.order ?? generated.order) },
    session: { transaction_id: tid, ...(named.session ?? generated.session) },
    delivery: { transaction_id: tid, ...(named.delivery ?? generated.delivery) },
  }
}

function lane(name: 'order' | 'session' | 'delivery') {
  return (req: any, res: any) => {
    const tid = req.query.transaction_id as string
    if (!tid) return res.status(400).json({ error: 'transaction_id query parameter is required' })
    if (tid === 'txn_missing') return res.status(404).json({ error: `${name} not found` })
    res.json(resolve(tid)[name])
  }
}

router.get('/order', lane('order'))
router.get('/session', lane('session'))
router.get('/delivery', lane('delivery'))

router.get('/customer', (req, res) => {
  const customerId = req.query.customer_id as string
  if (!customerId) return res.status(400).json({ error: 'customer_id query parameter is required' })
  if (customerId === 'cust_missing') return res.status(404).json({ error: 'Customer not found' })
  const hash = hashString(customerId)
  const priorCount = hash % 4
  res.json({
    customer_id: customerId,
    prior_disputes_count: priorCount,
    prior_outcomes: Array.from({ length: priorCount }, (_, i) => ((hash >> i) & 1 ? 'won' : 'lost')),
    account_age_days: 90 + (hash % 900),
    email: `customer${hash % 100}@example.com`,
  })
})

router.post('/stripe-submit', (req, res) => {
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

export default router
