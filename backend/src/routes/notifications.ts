import { Hono } from 'hono';
import { pool } from '../db/pool.js';

const notifications = new Hono();

/**
 * @description 최신 지수 및 뉴스를 알림 형태로 변환하여 반환
 */
notifications.get('/', async (c) => {
  try {
    const notifications = [];

    // 1. 최신 지수 정보 가져오기 (KOSPI, KOSDAQ)
    const stockResult = await pool.query(
      "SELECT name, price, change_val, change_rate, updated_at FROM stocks WHERE symbol IN ('KOSPI', 'KOSDAQ') ORDER BY symbol ASC"
    );

    for (const stock of stockResult.rows) {
      const isPlus = parseFloat(stock.change_val) >= 0;
      notifications.push({
        id: `stock-${stock.name}`,
        type: 'finance',
        title: `${stock.name} 지수 업데이트`,
        body: `${stock.name}이 ${parseFloat(stock.price).toLocaleString()} (${isPlus ? '+' : ''}${parseFloat(stock.change_rate).toFixed(2)}%) 기록 중입니다.`,
        time: stock.updated_at,
        read: false,
      });
    }

    // 2. 최신 뉴스 3건 가져오기
    const newsResult = await pool.query(
      "SELECT id, title, published_at FROM news ORDER BY published_at DESC LIMIT 3"
    );

    for (const news of newsResult.rows) {
      notifications.push({
        id: `news-${news.id}`,
        type: 'news',
        title: '실시간 속보',
        body: news.title,
        time: news.published_at,
        read: false,
      });
    }

    // 시간 순으로 정렬 (최신순)
    notifications.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

    return c.json({
      success: true,
      data: notifications,
    });
  } catch (err) {
    console.error('[Notifications API] Error:', err);
    return c.json({ success: false, message: '알림을 가져오는 중 오류가 발생했습니다.' }, 500);
  }
});

export default notifications;
