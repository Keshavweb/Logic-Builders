export const USE_MOCK_DATA = true

export const CONFIDENCE_THRESHOLDS = {
  strong: 80,
  moderate: 60,
} as const

export const PRODUCTS = [
  'Premium Yoga Mat',
  'Bluetooth Speaker',
  'Smartwatch',
  'Noise Cancelling Headphones',
  'Coffee Grinder',
  'Portable Projector',
  'USB-C Dock',
  'Air Fryer',
] as const

export const REQUIRED_CSV_COLUMNS = [
  'dispute_id',
  'order_id',
  'customer_id',
  'reason_code',
  'amount',
  'deadline',
  'transaction_id',
] as const
