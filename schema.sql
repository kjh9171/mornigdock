-- ── USERS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password     VARCHAR(255) NOT NULL,
  name         VARCHAR(100) NOT NULL,
  role         VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('admin','editor','user')),
  otp_secret   VARCHAR(255),
  otp_enabled  BOOLEAN NOT NULL DEFAULT false,
  is_blocked   BOOLEAN NOT NULL DEFAULT false,
  last_login   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── REFRESH TOKENS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── NEWS ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS news (
  id            SERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  content       TEXT,
  summary       TEXT,
  url           TEXT,
  image_url     TEXT,
  source        VARCHAR(255),
  category      VARCHAR(100),
  ai_analysis   TEXT,
  published_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── POSTS ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id             SERIAL PRIMARY KEY,
  type           VARCHAR(50) NOT NULL DEFAULT 'post',
  category       VARCHAR(100) NOT NULL DEFAULT 'general',
  title          TEXT NOT NULL,
  content        TEXT NOT NULL,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_pinned      BOOLEAN NOT NULL DEFAULT false,
  view_count     INTEGER NOT NULL DEFAULT 0,
  likes_count    INTEGER NOT NULL DEFAULT 0,
  dislikes_count INTEGER NOT NULL DEFAULT 0,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── COMMENTS ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  news_id    INTEGER REFERENCES news(id) ON DELETE CASCADE,
  post_id    INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_id  INTEGER REFERENCES comments(id) ON DELETE SET NULL,
  content    TEXT NOT NULL,
  is_deleted BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── REACTIONS ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reactions (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type VARCHAR(20) NOT NULL CHECK (target_type IN ('post','news','comment')),
  target_id   INTEGER NOT NULL,
  reaction    VARCHAR(20) NOT NULL CHECK (reaction IN ('like','dislike')),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, target_type, target_id)
);

-- ── MEDIA ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS media (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  type        VARCHAR(20) NOT NULL CHECK (type IN ('youtube','podcast','music')),
  url         TEXT NOT NULL,
  description TEXT DEFAULT '',
  thumbnail   TEXT DEFAULT '',
  artist      VARCHAR(200) DEFAULT '',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  play_count  INTEGER NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INQUIRIES ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inquiries (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  type       VARCHAR(50) NOT NULL DEFAULT 'general',
  title      TEXT NOT NULL,
  content    TEXT NOT NULL,
  status     VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','in_progress','resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ACCESS LOGS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS access_logs (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  ip_address VARCHAR(50),
  user_agent TEXT,
  action     VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── SYSTEM SETTINGS ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS system_settings (
  key        VARCHAR(100) PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── STOCKS ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stocks (
  id         SERIAL PRIMARY KEY,
  symbol     VARCHAR(20) NOT NULL UNIQUE,
  name       VARCHAR(200),
  price      NUMERIC(20,4),
  change     NUMERIC(20,4),
  change_pct NUMERIC(10,4),
  volume     BIGINT,
  market     VARCHAR(50),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── NOTIFICATIONS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(50) NOT NULL,
  title      TEXT NOT NULL,
  message    TEXT,
  is_read    BOOLEAN NOT NULL DEFAULT false,
  link       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── INDEXES ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_news_published_at   ON news(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_created_at    ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_news_id    ON comments(news_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id    ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user  ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_access_logs_user    ON access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user ON refresh_tokens(user_id);

-- ── 기본 관리자 계정 생성 ──────────────────────────────────────────────────
-- 비밀번호: Admin1234! (bcrypt hash)
INSERT INTO users (email, password, name, role)
VALUES (
  'gimjonghwan319@gmail.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj6oSE.jLI4W',
  '관리자',
  'admin'
) ON CONFLICT (email) DO NOTHING;

-- ── 기본 시스템 설정 ───────────────────────────────────────────────────────
INSERT INTO system_settings (key, value) VALUES
  ('ai_analysis_enabled', 'true'),
  ('auto_fetch_enabled',  'true'),
  ('maintenance_mode',    'false'),
  ('max_news_per_fetch',  '20'),
  ('news_fetch_interval', '3600')
ON CONFLICT (key) DO NOTHING;