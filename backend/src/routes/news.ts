import { Hono } from 'hono';
import { z } from 'zod';
import { query } from '../db/pool.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { fetchLatestNews } from '../services/newsService.js';

const news = new Hono();

// ─── GET /news ───────────────────────────────────────────────────────────────
news.get('/', optionalAuth(), async (c) => {
  const page     = Math.max(1, Number(c.req.query('page')  ?? 1));
  const limit    = Math.min(50, Math.max(1, Number(c.req.query('limit') ?? 20)));
  const category = c.req.query('category') ?? '';
  const search   = c.req.query('search')   ?? '';
  const offset   = (page - 1) * limit;

  let whereClause = 'WHERE 1=1';
  const params: (string | number)[] = [];
  let paramIdx = 1;

  if (category && category !== 'all') {
    whereClause += ` AND n.category = $${paramIdx++}`;
    params.push(category);
  }
  if (search) {
    whereClause += ` AND (n.title ILIKE $${paramIdx} OR n.description ILIKE $${paramIdx})`;
    params.push(`%${search}%`);
    paramIdx++;
  }

  const countResult = await query(
    `SELECT COUNT(*) FROM news n ${whereClause}`,
    params
  );
  const total = Number(countResult.rows[0].count);

  const dataResult = await query(
    `SELECT n.*, 
            (SELECT COUNT(*) FROM comments c WHERE c.news_id = n.id AND c.is_deleted = false) AS comment_count,
            (SELECT row_to_json(r) FROM ai_reports r WHERE r.news_id = n.id LIMIT 1) AS ai_report
     FROM news n
     ${whereClause}
     ORDER BY n.is_pinned DESC, n.published_at DESC
     LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
    [...params, limit, offset]
  );

  return c.json({
    success: true,
    data: {
      items: dataResult.rows,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    },
  });
});

// ─── GET /news/:id ───────────────────────────────────────────────────────────
news.get('/:id', optionalAuth(), async (c) => {
  const id = Number(c.req.param('id'));
  if (isNaN(id)) return c.json({ success: false, message: '잘못된 ID입니다.' }, 400);

  const result = await query(
    `SELECT n.*, 
            (SELECT row_to_json(r) FROM ai_reports r WHERE r.news_id = n.id LIMIT 1) AS ai_report
     FROM news n WHERE n.id = $1`,
    [id]
  );
  if ((result.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '뉴스를 찾을 수 없습니다.' }, 404);
  }
  return c.json({ success: true, data: result.rows[0] });
});

// ─── POST /news/fetch ─── 관리자 수동 수집 ──────────────────────────────────
news.post('/fetch', requireAuth(['admin', 'editor']), async (c) => {
  try {
    const count = await fetchLatestNews();
    return c.json({ success: true, message: `${count}개의 뉴스를 수집했습니다.` });
  } catch (err: any) {
    return c.json({ success: false, message: `수집 실패: ${err.message}` }, 500);
  }
});

// ─── PUT /news/:id/pin ── 관리자 핀 설정 ─────────────────────────────────────
news.put('/:id/pin', requireAuth(['admin']), async (c) => {
  const id = Number(c.req.param('id'));
  const body = await c.req.json().catch(() => ({}));
  const isPinned = Boolean(body.isPinned);

  await query('UPDATE news SET is_pinned = $1 WHERE id = $2', [isPinned, id]);
  return c.json({ success: true, message: isPinned ? '핀 설정 완료' : '핀 해제 완료' });
});

// ─── DELETE /news/:id ────────────────────────────────────────────────────────
news.delete('/:id', requireAuth(['admin']), async (c) => {
  const id = Number(c.req.param('id'));
  const result = await query('DELETE FROM news WHERE id = $1', [id]);
  if ((result.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '뉴스를 찾을 수 없습니다.' }, 404);
  }
  return c.json({ success: true, message: '삭제 완료' });
});

// ─── POST /news/:id/ai-report ── AI 분석 ─────────────────────────────────────
news.post('/:id/ai-report', requireAuth(), async (c) => {
  const id = Number(c.req.param('id'));

  // AI 분석 활성화 여부 확인
  const setting = await query(
    "SELECT value FROM system_settings WHERE key = 'ai_analysis_enabled'"
  );
  if (setting.rows[0]?.value !== 'true') {
    return c.json({ success: false, message: 'AI 분석 기능이 비활성화되어 있습니다.' }, 403);
  }

  const newsResult = await query('SELECT * FROM news WHERE id = $1', [id]);
  if ((newsResult.rowCount ?? 0) === 0) {
    return c.json({ success: false, message: '뉴스를 찾을 수 없습니다.' }, 404);
  }
  const article = newsResult.rows[0];

  // 기존 보고서 확인
  const existing = await query('SELECT * FROM ai_reports WHERE news_id = $1', [id]);
  if ((existing.rowCount ?? 0) > 0) {
    return c.json({ success: true, data: existing.rows[0] });
  }

  // 시뮬레이션 AI 분석 생성
  const report = generateAiReport(article);

  const saved = await query(
    'INSERT INTO ai_reports (news_id, summary, impact, advice) VALUES ($1,$2,$3,$4) RETURNING *',
    [id, report.summary, report.impact, report.advice]
  );
  return c.json({ success: true, data: saved.rows[0] });
});

function generateAiReport(article: any) {
  const categories: Record<string, any> = {
    business: {
      summary: `${article.title}에 관한 심층 분석 결과, 글로벌 시장에서 주목할 만한 변화가 감지됩니다.`,
      impact:  '금융 시장 전반에 걸쳐 단기 변동성 증가가 예상되며, 관련 섹터 주가에 영향을 미칠 수 있습니다.',
      advice:  '포트폴리오 리밸런싱을 검토하고, 헤지 포지션을 확보하는 전략을 권장합니다.',
    },
    technology: {
      summary: `${article.title}은 기술 패러다임의 전환점을 시사하는 중요한 사건입니다.`,
      impact:  '기존 산업 구조에 대한 파괴적 혁신이 가속화될 것으로 예상됩니다.',
      advice:  '핵심 기술 역량을 조기에 확보하고, 적응형 전략을 수립하는 것이 중요합니다.',
    },
    general: {
      summary: `${article.title}에 대한 AI 분석 결과, 다각도의 정보 검토가 필요한 사안입니다.`,
      impact:  '단기적으로는 제한적인 영향이 예상되나, 장기적 트렌드 변화 가능성을 모니터링해야 합니다.',
      advice:  '관련 분야의 전문가 견해를 추가로 참고하고, 다양한 시나리오에 대비한 대응 계획 수립을 권장합니다.',
    },
  };

  return categories[article.category] ?? categories.general;
}

export default news;
