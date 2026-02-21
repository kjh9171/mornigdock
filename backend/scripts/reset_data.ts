import 'dotenv/config';
import { pool } from './db/pool.ts';
import { fetchLatestNews } from './services/newsService.ts';
import { fetchStockService } from './stockService.ts';

async function resetAndFetch() {
  console.log('🔄 CERT: Starting Data Reset & Scrutiny Protocol...');

  try {
    // 1. Clear existing corrupt data
    console.log('🗑️  Clearing corrupt data...');
    await pool.query('TRUNCATE TABLE news CASCADE');
    await pool.query('TRUNCATE TABLE posts CASCADE');
    await pool.query('TRUNCATE TABLE stocks CASCADE');
    await pool.query('DELETE FROM comments');

    // 2. Fetch Fresh News
    console.log('📰 Fetching Global Intelligence (News)...');
    await fetchLatestNews();

    // 3. Fetch Market Data
    console.log('📈 Fetching Market Indices (Stocks)...');
    await fetchStockService();

    console.log('✅ All Operations Complete. System Ready.');
  } catch (err) {
    console.error('❌ Operation Failed:', err);
  } finally {
    await pool.end();
  }
}

resetAndFetch();
