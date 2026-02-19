import { Hono } from 'hono'
import pool from '../db'
import { optionalAuth } from '../middleware/auth'

export const stocksRouter = new Hono()

// ─── GET /api/stocks ───
stocksRouter.get('/', optionalAuth, async (c) => {
  try {
    const result = await pool.query('SELECT * FROM stocks ORDER BY id ASC')
    return c.json({
      success: true,
      stocks: result.rows,
    })
  } catch (err) {
    return c.json({ success: false }, 500)
  }
})
