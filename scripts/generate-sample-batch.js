const fs = require('fs')
const path = require('path')

const seedDataPath = path.join(__dirname, '../apps/mock-services/seed-data.json')
const seedData = JSON.parse(fs.readFileSync(seedDataPath, 'utf8'))

const rows = []
const reasonCodes = ['product_not_received', 'unauthorized_transaction', 'duplicate_charge']

let i = 1
for (const [transaction_id, data] of Object.entries(seedData)) {
  const dispute_id = `DSP-90${i}`
  const customer_id = `CUST-70${i}`
  const reason_code = reasonCodes[i % reasonCodes.length]
  const amount = data.order.amount
  const deadline = new Date()
  deadline.setDate(deadline.getDate() + 7)
  const deadlineStr = deadline.toISOString().split('T')[0]

  rows.push(`${dispute_id},${data.order.order_id},${customer_id},${reason_code},${amount},${deadlineStr},${transaction_id}`)
  i++
}

const csvHeader = 'dispute_id,order_id,customer_id,reason_code,amount,deadline,transaction_id'
const csvContent = [csvHeader, ...rows].join('\n')

const outPath = path.join(__dirname, '../sample-batch.csv')
fs.writeFileSync(outPath, csvContent)
console.log(`Generated ${outPath} with ${rows.length} valid seeded rows.`)
