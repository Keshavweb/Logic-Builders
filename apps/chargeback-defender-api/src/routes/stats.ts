import { Router } from 'express'
import { getStats } from '../db/disputes.js'

const router = Router()

// ---------- GET /api/stats ----------

router.get('/', async (_req, res) => {
  try {
    const stats = await getStats()
    res.json(stats)
  } catch (err) {
    console.error('[stats] Failed to compute stats:', err)
    res.status(500).json({ error: 'Failed to compute stats' })
  }
})

export default router
