import express from 'express'
import cors from 'cors'

const app = express()
app.use(cors())
app.use(express.json())

const PORT = 3001

const scenarios = {
  // 1. Clean strong-evidence case
  txn_clean: {
    order: {
      transaction_id: 'txn_clean',
      order_id: 'ORD-CLEAN',
      product: 'Premium Coffee Maker',
      amount: 150.00,
      currency: 'USD',
      order_date: '2026-08-25T10:30:00.000Z',
      payment_method: 'Visa ending 4242',
      billing_address: '123 Main St, Portland, OR',
      shipping_address: '123 Main St, Portland, OR',
      customer_email: 'clean@example.com'
    },
    session: {
      ip_address: '172.16.0.1',
      device_fingerprint: 'fp_clean',
      device_match: true,
      login_location: 'Portland, OR, US'
    },
    delivery: {
      status: 'delivered',
      delivered_at: '2026-08-27T14:55:00.000Z',
      signature_available: true,
      photo_available: true,
      carrier: 'UPS'
    }
  },

  // 2. Thin-evidence case
  txn_thin: {
    order: {
      transaction_id: 'txn_thin',
      order_id: 'ORD-THIN',
      product: 'Digital Gift Card',
      amount: 25.00,
      currency: 'USD',
      order_date: '2026-08-26T11:00:00.000Z',
      payment_method: 'Mastercard ending 1111',
      billing_address: '456 Oak Ave, Seattle, WA',
      shipping_address: null,
      customer_email: 'thin@example.com'
    },
    session: {
      ip_address: '192.168.1.100',
      device_fingerprint: 'fp_thin',
      device_match: false, // No session match
      login_location: 'Unknown'
    },
    delivery: {
      status: 'delivered',
      delivered_at: '2026-08-26T11:05:00.000Z',
      signature_available: false,
      photo_available: false, // No delivery photo
      carrier: 'Email Delivery'
    }
  },

  // 3. Repeat-disputer case
  txn_repeat: {
    order: {
      transaction_id: 'txn_repeat',
      order_id: 'ORD-REPEAT',
      product: 'Gaming Headset',
      amount: 80.00,
      currency: 'USD',
      order_date: '2026-08-20T09:00:00.000Z',
      payment_method: 'Amex ending 9999',
      billing_address: '789 Pine Rd, Austin, TX',
      shipping_address: '789 Pine Rd, Austin, TX',
      customer_email: 'repeat@example.com'
    },
    session: {
      ip_address: '10.0.0.5',
      device_fingerprint: 'fp_repeat',
      device_match: true,
      login_location: 'Austin, TX, US'
    },
    delivery: {
      status: 'delivered',
      delivered_at: '2026-08-22T16:20:00.000Z',
      signature_available: false,
      photo_available: true,
      carrier: 'FedEx'
    }
  }
}

app.get('/api/mock/order', (req, res) => {
  const tid = req.query.transaction_id
  if (tid === 'txn_missing') return res.status(404).json({ error: 'Order not found' })
  const data = scenarios[tid]?.order
  if (data) return res.json(data)
  res.status(404).json({ error: 'Order not found' })
})

app.get('/api/mock/session', (req, res) => {
  const tid = req.query.transaction_id
  if (tid === 'txn_missing') return res.status(404).json({ error: 'Session not found' })
  const data = scenarios[tid]?.session
  if (data) return res.json(data)
  res.status(404).json({ error: 'Session not found' })
})

app.get('/api/mock/delivery', (req, res) => {
  const tid = req.query.transaction_id
  if (tid === 'txn_missing') return res.status(404).json({ error: 'Delivery not found' })
  const data = scenarios[tid]?.delivery
  if (data) return res.json(data)
  res.status(404).json({ error: 'Delivery not found' })
})

app.post('/api/mock/stripe-submit', (req, res) => {
  const { dispute_id } = req.body
  if (!dispute_id) return res.status(400).json({ error: 'dispute_id is required' })
  res.json({
    dispute_id,
    submitted: true,
    submitted_at: new Date().toISOString(),
    processor_reference: 'mock_ref_' + Math.random().toString(36).slice(2),
    status: 'evidence_submitted'
  })
})

app.listen(PORT, () => {
  console.log(`[mock-services] Running on http://localhost:${PORT}`)
})
