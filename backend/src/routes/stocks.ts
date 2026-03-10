import { Hono } from 'hono'
import { pool } from '../db/pool.js'
import { optionalAuth } from '../middleware/auth.js'
import { fetchStockService } from '../stockService.js'

const stocksRouter = new Hono()

// ── GET /api/stocks/fetch (크론 작업용) ──
stocksRouter.get('/fetch', async (c) => {
  try {
    await fetchStockService();
    return c.json({ success: true, message: '증시 데이터 동기화 완료' });
  } catch (err: any) {
    return c.json({ success: false, message: '동기화 실패', error: err.message }, 500);
  }
});

// ─── GET /api/stocks ───
stocksRouter.get('/', optionalAuth(), async (c) => {
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

export default stocksRouter
