import { Hono } from 'hono';
import { query } from '../db/pool.ts';
import { scrapeArticleContent } from '../services/newsService.ts';
import { analyzeNewsWithGemini } from '../services/geminiService.ts';
import { requireAuth, optionalAuth } from '../middleware/auth.ts';

const newsRoutes = new Hono();

// 뉴스 목록 조회
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
      `SELECT *, 
        (SELECT COUNT(*) FROM comments WHERE news_id = news.id) as comment_count,
        (SELECT row_to_json(r) FROM ai_reports r WHERE r.news_id = news.id LIMIT 1) as ai_report
       FROM news 
       WHERE ${whereClause} 
       ORDER BY is_pinned DESC, published_at DESC 
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

// 뉴스 상세 정보 및 AI 분석 결과 조회
newsRoutes.get('/:id', optionalAuth(), async (c) => {
  const id = c.req.param('id');
  try {
    const res = await query(
      `SELECT *, 
        (SELECT row_to_json(r) FROM ai_reports r WHERE r.news_id = news.id LIMIT 1) as ai_report
       FROM news WHERE id = $1`, 
      [id]
    );
    if (res.rows.length === 0) return c.json({ success: false, message: 'News not found' }, 404);
    return c.json({ success: true, data: res.rows[0] });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// AI 분석 요청 (진짜 Gemini AI 분석 수행)
newsRoutes.post('/:id/ai-report', requireAuth(), async (c) => {
  const id = c.req.param('id');
  
  try {
    // 1. 이미 분석된 내용이 있는지 확인
    const checkRes = await query('SELECT * FROM ai_reports WHERE news_id = $1', [id]);
    if (checkRes.rows.length > 0) return c.json({ success: true, data: checkRes.rows[0] });

    // 2. 뉴스 기본 정보 및 원문 URL 조회
    const newsRes = await query('SELECT title, url, category FROM news WHERE id = $1', [id]);
    if (newsRes.rows.length === 0) return c.json({ success: false, message: 'News not found' }, 404);
    const news = newsRes.rows[0];

    // 3. 원문 크롤링 수행
    console.log(`[AI Analysis] Scrutinizing source content from: ${news.url}`);
    const fullContent = await scrapeArticleContent(news.url);
    
    // 4. Gemini AI를 활용한 정밀 분석
    const analysis = await analyzeNewsWithGemini(news.title, fullContent || news.description || '');

    // 5. DB 저장 및 반환
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

// 좋아요/싫어요 반응 처리
newsRoutes.post('/:id/reaction', requireAuth(), async (c) => {
  const id = c.req.param('id');
  const user = c.get('user'); // JwtPayload { userId, ... }
  const { reaction } = await c.req.json(); // 'like' or 'dislike'

  if (!user) return c.json({ success: false, message: '인증이 필요합니다.' }, 401);
  if (!['like', 'dislike'].includes(reaction)) return c.json({ success: false, message: 'Invalid reaction' }, 400);

  try {
    // 기존 반응 확인 및 업데이트 (UPSERT)
    await query(
      `INSERT INTO reactions (user_id, target_type, target_id, reaction)
       VALUES ($1, 'news', $2, $3)
       ON CONFLICT (user_id, target_type, target_id) 
       DO UPDATE SET reaction = EXCLUDED.reaction`,
      [user.userId, id, reaction]
    );

    // 통계 업데이트
    await query(`
      UPDATE news SET 
        likes_count = (SELECT COUNT(*) FROM reactions WHERE target_type = 'news' AND target_id = $1 AND reaction = 'like'),
        dislikes_count = (SELECT COUNT(*) FROM reactions WHERE target_type = 'news' AND target_id = $1 AND reaction = 'dislike')
      WHERE id = $1
    `, [id]);

    const updated = await query('SELECT likes_count, dislikes_count FROM news WHERE id = $1', [id]);
    return c.json({ success: true, data: updated.rows[0] });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

// 뉴스 수집 트리거
newsRoutes.post('/fetch', requireAuth(['admin']), async (c) => {
  try {
    const { fetchLatestNews } = await import('../services/newsService.ts');
    const count = await fetchLatestNews();
    return c.json({ success: true, count, message: `${count}개의 뉴스를 수집했습니다.` });
  } catch (err: any) {
    return c.json({ success: false, message: err.message }, 500);
  }
});

export default newsRoutes;
