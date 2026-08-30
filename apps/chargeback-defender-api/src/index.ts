import cors from 'cors'
import express from 'express'
import { config, validateConfig } from './config.js'
import { initializeDatabase, shutdownDatabase } from './db/connection.js'
import batchRouter from './routes/batch.js'
import disputesRouter from './routes/disputes.js'
import statsRouter from './routes/stats.js'
import webhooksRouter from './routes/webhooks.js'

// ---------- Validate config ----------
validateConfig()

// ---------- Express app ----------
const app = express()

app.use(cors())
app.use(express.json({ limit: '2mb' }))

// ---------- Routes ----------
app.use('/api/batch', batchRouter)
app.use('/api/disputes', disputesRouter)
app.use('/api/stats', statsRouter)
app.use('/api/webhooks', webhooksRouter)

// ---------- Health check ----------
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    mock_mode: config.USE_MOCK_PIPELINE,
    timestamp: new Date().toISOString(),
  })
})

// ---------- Startup ----------
async function start() {
  try {
    await initializeDatabase()
    console.log(`[server] Database connected & schema ready`)
    console.log(`[server] Mock pipeline: ${config.USE_MOCK_PIPELINE ? 'ENABLED' : 'DISABLED'}`)

    app.listen(config.PORT, () => {
      console.log(`[server] Chargeback Defender API running at http://localhost:${config.PORT}`)
      console.log(`[server] Concurrency limit: ${config.CONCURRENCY_LIMIT}`)
    })
  } catch (err) {
    console.error('[server] Failed to start:', err)
    process.exit(1)
  }
}

// ---------- Graceful shutdown ----------
async function shutdown() {
  console.log('\n[server] Shutting down...')
  await shutdownDatabase()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)

start()
