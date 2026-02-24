-- ══════════════════════════════════════════════════
-- 🏛️ AGORA - Database Schema (v3.0 Complete)
-- ══════════════════════════════════════════════════

-- 인코딩 명시 (한글 깨짐 방지)
SET client_encoding = 'UTF8';

-- ── 사용자 테이블 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          SERIAL PRIMARY KEY,
  email       VARCHAR(255) UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  name        VARCHAR(100) NOT NULL,
  role        VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','editor','user')),
  otp_secret  TEXT,
  otp_enabled BOOLEAN NOT NULL DEFAULT false,
  is_blocked  BOOLEAN NOT NULL DEFAULT false,
  last_login  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 접속 로그 테이블 ──────────────────────────────────
CREATE TABLE IF NOT EXISTS access_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE SET NULL,
  email      VARCHAR(255),
  ip_address VARCHAR(50),
  user_agent TEXT,
  action     VARCHAR(100),
  endpoint   VARCHAR(255),        -- 요청 엔드포인트 컬럼 추가
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Refresh Token 테이블 ──────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 뉴스 테이블 ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT,
  content       TEXT,
  url           TEXT UNIQUE,
  image_url     TEXT,
  urlToImage    TEXT,              -- 프론트엔드 호환용 이미지 URL
  source_name   TEXT,
  source        TEXT,              -- source 단축 컬럼
  category      VARCHAR(50) DEFAULT 'general',
  is_pinned     BOOLEAN NOT NULL DEFAULT false,
  is_featured   BOOLEAN NOT NULL DEFAULT false,
  likes_count   INT NOT NULL DEFAULT 0,
  dislikes_count INT NOT NULL DEFAULT 0,
  published_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── AI 분석 보고서 테이블 ─────────────────────────────
CREATE TABLE IF NOT EXISTS ai_reports (
  id         SERIAL PRIMARY KEY,
  news_id    INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  summary    TEXT,
  impact     TEXT,
  advice     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 게시판 테이블 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id             SERIAL PRIMARY KEY,
  user_id        INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category       VARCHAR(50) DEFAULT 'general',
  type           VARCHAR(20) DEFAULT 'post' CHECK (type IN ('post','news','notice')),
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  source         TEXT,
  source_url     TEXT UNIQUE,
  ai_analysis    TEXT,
  is_pinned      BOOLEAN NOT NULL DEFAULT false,
  view_count     INT NOT NULL DEFAULT 0,
  likes_count    INT NOT NULL DEFAULT 0,   -- 좋아요 수 컬럼 추가
  dislikes_count INT NOT NULL DEFAULT 0,   -- 싫어요 수 컬럼 추가
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 댓글 테이블 (계층형 - 대댓글 지원) ───────────────
CREATE TABLE IF NOT EXISTS comments (
  id          SERIAL PRIMARY KEY,
  news_id     INT REFERENCES news(id) ON DELETE CASCADE,
  post_id     INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id   INT REFERENCES comments(id) ON DELETE CASCADE,  -- 대댓글 부모 ID
  content     TEXT NOT NULL,
  is_deleted  BOOLEAN NOT NULL DEFAULT false,
  likes_count INT NOT NULL DEFAULT 0,   -- 댓글 좋아요
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 반응 테이블 (좋아요/싫어요 - 중복 방지) ──────────
CREATE TABLE IF NOT EXISTS reactions (
  id          SERIAL PRIMARY KEY,
  user_id     INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post','news','comment')),
  target_id   INT NOT NULL,
  reaction    VARCHAR(10) NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)  -- 동일 대상 중복 반응 방지
);

-- ── 문의 테이블 (inquiry / 음악 신청 포함) ───────────
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

-- ── 미디어 테이블 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('youtube','podcast','music')),
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT NOT NULL,
  thumbnail   TEXT,
  duration    INT,
  artist      TEXT,               -- 아티스트/채널명
  is_active   BOOLEAN NOT NULL DEFAULT true,
  is_featured BOOLEAN NOT NULL DEFAULT false,  -- 추천 미디어 여부
  play_count  INT NOT NULL DEFAULT 0,          -- 재생 횟수 통계
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 증시 지수 정보 테이블 ─────────────────────────────
CREATE TABLE IF NOT EXISTS stocks (
  id            SERIAL PRIMARY KEY,
  symbol        VARCHAR(50) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  price         DECIMAL(15,2) NOT NULL DEFAULT 0,
  change_val    DECIMAL(15,2) NOT NULL DEFAULT 0,
  change_amount VARCHAR(50) DEFAULT '0',        -- 변동금액 문자열 형태
  change_rate   DECIMAL(10,4) NOT NULL DEFAULT 0,
  market_status VARCHAR(20) DEFAULT 'CLOSED',
  ai_summary    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 시스템 설정 테이블 ────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ════════════════════════════════════════
-- 인덱스 (성능 최적화)
-- ════════════════════════════════════════
CREATE INDEX IF NOT EXISTS idx_news_created_at      ON news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category        ON news(category);
CREATE INDEX IF NOT EXISTS idx_news_published_at    ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_news_id     ON comments(news_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id     ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id   ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user     ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_time     ON access_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reactions_target     ON reactions(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_posts_user           ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at     ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_media_type           ON media(type);
CREATE INDEX IF NOT EXISTS idx_inquiries_status     ON inquiries(status);

-- ════════════════════════════════════════
-- 기본 시스템 설정 초기값
-- ════════════════════════════════════════
INSERT INTO system_settings (key, value) VALUES
  ('ai_analysis_enabled', 'true'),
  ('auto_fetch_enabled', 'true'),
  ('news_fetch_interval', '60'),
  ('max_news_per_fetch', '20'),
  ('site_name', 'Agora'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- ════════════════════════════════════════
-- 관리자 계정 초기화
-- 비밀번호: Admin@1234!
-- ════════════════════════════════════════
INSERT INTO users (email, password, name, role, otp_enabled)
VALUES (
  'admin@agora.com',
  '$2a$12$IOmk9pcX83gvdTQ5ROiKPOefc/8tCpFcrud0kB6S308BmpJEvFCcy',
  'Agora Admin',
  'admin',
  false
) ON CONFLICT (email) DO NOTHING;

-- ════════════════════════════════════════
-- 샘플 미디어 데이터 (초기 시연용)
-- ════════════════════════════════════════
INSERT INTO media (type, title, description, url, thumbnail, artist, is_featured, is_active) VALUES
  ('youtube', 'AI 트렌드 2024 총정리 - 테크크런치 코리아', '인공지능 최신 동향과 기업 전략을 심층 분석합니다.', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg', 'TechCrunch Korea', true, true),
  ('podcast', '투자의 기술 - 글로벌 마켓 브리핑', '월가 전문가들의 실시간 시장 분석과 투자 전략을 공유합니다.', 'https://www.youtube.com/watch?v=9bZkp7q19f0', 'https://images.unsplash.com/photo-1478737270239-2f02b77fc618?q=80&w=480', '마켓 인사이트', false, true),
  ('music', 'Deep Focus - Lo-fi Coding Sessions', '집중력을 높여주는 Lo-fi 힙합 플레이리스트입니다.', 'https://www.youtube.com/watch?v=jfKfPfyJRdk', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=480', 'Lofi Girl', true, true)
ON CONFLICT DO NOTHING;
