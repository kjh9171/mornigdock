-- ══════════════════════════════════════════════════
-- 🏛️ AGORA - Database Schema (v2.0)
-- ══════════════════════════════════════════════════

-- 인코딩 명시 (한글 깨짐 방지)
SET client_encoding = 'UTF8';

-- 사용자 테이블
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

-- 접속 로그 테이블
CREATE TABLE IF NOT EXISTS access_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INT REFERENCES users(id) ON DELETE CASCADE,
  email      VARCHAR(255),
  ip_address VARCHAR(50),
  user_agent TEXT,
  action     VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Refresh Token 테이블
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 뉴스 테이블
CREATE TABLE IF NOT EXISTS news (
  id           SERIAL PRIMARY KEY,
  title        TEXT NOT NULL,
  description  TEXT,
  content      TEXT,
  url          TEXT UNIQUE,
  image_url    TEXT,
  source_name  TEXT,
  category     VARCHAR(50) DEFAULT 'general',
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  is_featured  BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- AI 분석 보고서 테이블
CREATE TABLE IF NOT EXISTS ai_reports (
  id         SERIAL PRIMARY KEY,
  news_id    INT NOT NULL REFERENCES news(id) ON DELETE CASCADE,
  summary    TEXT,
  impact     TEXT,
  advice     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 게시판 테이블 (통합 지능 저장소)
CREATE TABLE IF NOT EXISTS posts (
  id           SERIAL PRIMARY KEY,
  user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category     VARCHAR(50) DEFAULT 'general',
  type         VARCHAR(20) DEFAULT 'post' CHECK (type IN ('post','news','notice')),
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  source       TEXT,
  source_url   TEXT UNIQUE,
  ai_analysis  TEXT,
  is_pinned    BOOLEAN NOT NULL DEFAULT false,
  view_count   INT NOT NULL DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 댓글 테이블 (계층형)
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  news_id    INT REFERENCES news(id) ON DELETE CASCADE,
  post_id    INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  INT REFERENCES comments(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 증시 지수 정보 테이블
CREATE TABLE IF NOT EXISTS stocks (
  id            SERIAL PRIMARY KEY,
  symbol        VARCHAR(50) UNIQUE NOT NULL,
  name          VARCHAR(100) NOT NULL,
  price         DECIMAL(15,2) NOT NULL DEFAULT 0,
  change_val    DECIMAL(15,2) NOT NULL DEFAULT 0,
  change_rate   DECIMAL(10,4) NOT NULL DEFAULT 0,
  market_status VARCHAR(20) DEFAULT 'CLOSED',
  ai_summary    TEXT,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 미디어 테이블
CREATE TABLE IF NOT EXISTS media (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('youtube','podcast','music')),
  title       TEXT NOT NULL,
  description TEXT,
  url         TEXT NOT NULL,
  thumbnail   TEXT,
  duration    INT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 시스템 설정 테이블
CREATE TABLE IF NOT EXISTS system_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 인덱스 ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_news_created_at    ON news(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_category      ON news(category);
CREATE INDEX IF NOT EXISTS idx_comments_news_id   ON comments(news_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_user   ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_access_logs_time   ON access_logs(created_at DESC);

-- ── 기본 시스템 설정 ─────────────────────────────────────
INSERT INTO system_settings (key, value) VALUES
  ('ai_analysis_enabled', 'true'),
  ('auto_fetch_enabled', 'true'),
  ('news_fetch_interval', '60'),
  ('max_news_per_fetch', '20'),
  ('site_name', 'Agora'),
  ('maintenance_mode', 'false')
ON CONFLICT (key) DO NOTHING;

-- ── 관리자 계정 초기화 ────────────────────────────────────
-- 비밀번호: Admin@1234! (bcrypt hash - 실제 배포 시 변경 필수)
INSERT INTO users (email, password, name, role, otp_enabled)
VALUES (
  'admin@agora.com',
  '$2a$12$IOmk9pcX83gvdTQ5ROiKPOefc/8tCpFcrud0kB6S308BmpJEvFCcy',
  'Agora Admin',
  'admin',
  false
) ON CONFLICT (email) DO NOTHING;
