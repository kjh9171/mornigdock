import { Hono } from 'hono';
import { query } from '../db/pool.ts';
import { scrapeArticleContent } from '../services/newsService.ts';
import { analyzeNewsWithGemini } from '../services/geminiService.ts';
import { requireAuth, optionalAuth } from '../middleware/auth.ts';

const newsRoutes = new Hono();

// ─── 뉴스 목록 조회 ────────────────────────────────────────────────────────
newsRoutes.get('/', optionalAuth(), async (c) => {
  const page = Math.max(1, Number(c.req.query('page') || 1));
  const limit = Math.min(50, Math.max(1, Number(c.req.query('limit') || 20)));
  const category = c.req.query('category') || 'all';
  const search = c.req.query('search') || '';
  const offset = (page - 1) * limit;

  let whereClause = '1=1';
  const params: any[] = [];
  let pIdx = 1;

  if (category !== 'all') {
    whereClause += ` AND category = $${pIdx++}`;
    params.push(category);
  }

  if (search) {
    whereClause += ` AND (title ILIKE $${pIdx} OR description ILIKE $${pIdx})`;
    params.push(`%${search}%`);
    pIdx++;
  }

  try {
    const totalRes = await query(`SELECT COUNT(*) FROM news WHERE ${whereClause}`, params);
    const total = Number(totalRes.rows[0].count);

    const dataRes = await query(
      `SELECT n.*, 
        (SELECT COUNT(*) FROM comments WHERE news_id = n.id) as comment_count,
        (SELECT row_to_json(r) FROM ai_reports r WHERE r.news_id = n.id LIMIT 1) as ai_report
       FROM news n
       WHERE ${whereClause} 
       ORDER BY n.is_pinned DESC, n.published_at DESC 
       LIMIT $${pIdx++} OFFSET $${pIdx++}`,
      [...params, limit, offset]
    );

    return c.json({
      success: true,
      data: {
        items: dataRes.rows,
        pagination: { total, page, limit, totalPages: Math.ceil(total / limit) }
      }
    });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ─── 뉴스 상세 및 AI 분석 결과 조회 ──────────────────────────────────────────
newsRoutes.get('/:id', optionalAuth(), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, message: 'Invalid ID' }, 400);

  try {
    const res = await query(
      `SELECT n.*, 
        (SELECT row_to_json(r) FROM ai_reports r WHERE r.news_id = n.id LIMIT 1) as ai_report
       FROM news n WHERE n.id = $1`, 
      [id]
    );
    if (res.rows.length === 0) return c.json({ success: false, message: 'News not found' }, 404);
    return c.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// ─── AI 분석 요청 (진짜 정밀 분석) ──────────────────────────────────────────
newsRoutes.post('/:id/ai-report', requireAuth(), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, message: 'Invalid ID' }, 400);
  
  try {
    // 1. 이미 분석된 리포트가 있으면 즉시 반환
    const checkRes = await query('SELECT * FROM ai_reports WHERE news_id = $1', [id]);
    if (checkRes.rows.length > 0) return c.json({ success: true, data: checkRes.rows[0] });

    // 2. 뉴스 데이터 로드
    const newsRes = await query('SELECT title, url, description FROM news WHERE id = $1', [id]);
    if (newsRes.rows.length === 0) return c.json({ success: false, message: 'News not found' }, 404);
    const n = newsRes.rows[0];

    // 3. 본문 크롤링 및 Gemini 분석 실행
    const fullContent = await scrapeArticleContent(n.url);
    const analysis = await analyzeNewsWithGemini(n.title, fullContent || n.description || '');

    // 4. DB 저장
    const insertRes = await query(
      `INSERT INTO ai_reports (news_id, summary, impact, advice)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, analysis.summary, analysis.impact, analysis.advice]
    );

    return c.json({ success: true, data: insertRes.rows[0] });
  } catch (err: any) {
    console.error('[AI Analysis Error]', err);
    return c.json({ success: false, message: 'AI Analysis Operation Failed' }, 500);
  }
});

// ─── 좋아요/싫어요 반응 (정밀 처리) ──────────────────────────────────────────
newsRoutes.post('/:id/reaction', requireAuth(), async (c) => {
  const id = parseInt(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, message: 'Invalid ID' }, 400);

  const user = c.get('user'); 
  const { reaction } = await c.req.json().catch(() => ({})); 

  if (!['like', 'dislike'].includes(reaction)) {
    return c.json({ success: false, message: 'Invalid reaction type' }, 400);
  }

  try {
    // 1. 반응 데이터 기록 (UPSERT)
    await query(
      `INSERT INTO reactions (user_id, target_type, target_id, reaction)
       VALUES ($1, 'news', $2, $3)
       ON CONFLICT (user_id, target_type, target_id) 
       DO UPDATE SET reaction = EXCLUDED.reaction`,
      [user.userId, id, reaction]
    );

    // 2. 뉴스 테이블 통계 강제 갱신
    await query(`
      UPDATE news SET 
        likes_count = (SELECT COUNT(*) FROM reactions WHERE target_type = 'news' AND target_id = $1 AND reaction = 'like'),
        dislikes_count = (SELECT COUNT(*) FROM reactions WHERE target_type = 'news' AND target_id = $1 AND reaction = 'dislike')
      WHERE id = $1
    `, [id]);

    // 3. 최신 숫자 반환
    const updated = await query('SELECT likes_count, dislikes_count FROM news WHERE id = $1', [id]);
    return c.json({ success: true, data: updated.rows[0] });
  } catch (err: any) {
    console.error('[Reaction Error]', err);
    return c.json({ success: false, message: 'Reaction processing failed' }, 500);
  }
});

export default newsRoutes;
