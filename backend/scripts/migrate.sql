-- ══════════════════════════════════════════════════
-- 🔧 AGORA - Migration Script (v2 → v3)
-- 기존 DB에 안전하게 누락 요소를 추가합니다.
-- ══════════════════════════════════════════════════

SET client_encoding = 'UTF8';

-- ── access_logs 테이블에 endpoint 컬럼 추가 ──────────
ALTER TABLE access_logs ADD COLUMN IF NOT EXISTS endpoint VARCHAR(255);

-- ── news 테이블에 누락 컬럼 추가 ─────────────────────
ALTER TABLE news ADD COLUMN IF NOT EXISTS urlToImage TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;
ALTER TABLE news ADD COLUMN IF NOT EXISTS dislikes_count INT NOT NULL DEFAULT 0;
ALTER TABLE news ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
-- published_at 기본값 채우기 (기존 레코드)
UPDATE news SET published_at = created_at WHERE published_at IS NULL;
-- urlToImage를 image_url에서 복사
UPDATE news SET urlToImage = image_url WHERE urlToImage IS NULL AND image_url IS NOT NULL;
-- source를 source_name에서 복사
UPDATE news SET source = source_name WHERE source IS NULL AND source_name IS NOT NULL;

-- ── posts 테이블에 누락 컬럼 추가 ────────────────────
ALTER TABLE posts ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS dislikes_count INT NOT NULL DEFAULT 0;

-- ── comments 테이블에 누락 컬럼 추가 ─────────────────
ALTER TABLE comments ADD COLUMN IF NOT EXISTS likes_count INT NOT NULL DEFAULT 0;

-- ── media 테이블에 누락 컬럼 추가 ────────────────────
ALTER TABLE media ADD COLUMN IF NOT EXISTS is_featured BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE media ADD COLUMN IF NOT EXISTS play_count INT NOT NULL DEFAULT 0;
ALTER TABLE media ADD COLUMN IF NOT EXISTS artist TEXT;
ALTER TABLE media ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ── stocks 테이블에 누락 컬럼 추가 ───────────────────
ALTER TABLE stocks ADD COLUMN IF NOT EXISTS change_amount VARCHAR(50) DEFAULT '0';

-- ── reactions 테이블 새로 생성 ──────────────────────
CREATE TABLE IF NOT EXISTS reactions (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post','news','comment')),
  target_id   INT NOT NULL,
  reaction    VARCHAR(10) NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

-- ── inquiries 테이블 새로 생성 ──────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  type       VARCHAR(30) NOT NULL DEFAULT 'general' CHECK (type IN ('general','music_request','report','other')),
  title      TEXT NOT NULL,
  content    TEXT,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved','rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 인덱스 추가 ───────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_reactions_target   ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_news_published_at  ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_user         ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at   ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_type         ON media(type);
CREATE INDEX IF NOT EXISTS idx_inquiries_status   ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_comments_post_id   ON comments(post_id);

-- ── 샘플 미디어 데이터 (없을 경우에만 추가) ───────────
INSERT INTO media (type, title, description, url, thumbnail, artist, is_featured, is_active) VALUES
  ('youtube', 'AI 트렌드 2024 총정리 - 테크크런치 코리아', '인공지능 최신 동향과 기업 전략을 심층 분석합니다.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 'TechCrunch Korea', true, true),
  ('podcast', '투자의 기술 - 글로벌 마켓 브리핑', '월가 전문가들의 실시간 시장 분석과 투자 전략을 공유합니다.', 'https://www.youtube.com/watch?v=9bZkp7q19f0', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=480', '마켓 인사이트', false, true),
  ('music', 'Deep Focus - Lo-fi Coding Sessions', '집중력을 높여주는 Lo-fi 힙합 플레이리스트입니다.', 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=480', 'Lofi Girl', true, true)
ON CONFLICT DO NOTHING;

SELECT '✅ 마이그레이션 완료!' AS status;
