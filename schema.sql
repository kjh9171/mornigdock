-- Morning Dock Platform Schema (V4.1)

CREATE TABLE IF NOT EXISTS users (
    uid TEXT PRIMARY KEY,
    email TEXT UNIQUE,
    mfa_secret TEXT,
    mfa_enabled INTEGER DEFAULT 0,
    role TEXT DEFAULT 'USER',
    status TEXT DEFAULT 'APPROVED',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    title TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(uid)
);

CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    link TEXT UNIQUE,
    summary TEXT,
    discussion_question TEXT,
    model_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_sources (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    url TEXT UNIQUE,
    category TEXT
);

CREATE TABLE IF NOT EXISTS media (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT,
    url TEXT,
    icon TEXT
);

-- 초기 미디어 데이터 삽입
INSERT OR IGNORE INTO media (name, type, url, icon) VALUES 
('YTN 실시간 속보', 'PODCAST', 'https://www.youtube.com/user/ytnnews24', 'fa-solid fa-play-circle'),
('연합뉴스TV', 'NEWS', 'https://www.youtube.com/c/YonhapNewsTV', 'fa-solid fa-tv'),
('클래식 선율', 'HEALING', 'https://www.youtube.com/results?search_query=classic+music', 'fa-solid fa-music');

-- 초기 뉴스 소스 삽입
INSERT OR IGNORE INTO news_sources (name, url, category) VALUES 
('연합뉴스 속보', 'https://www.yonhapnewstv.co.kr/browse/feed/', 'MAJOR'),
('네이버 뉴스 속보', 'https://news.naver.com/rss/rss_press.nhn?press=001', 'MAJOR');

CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    post_id INTEGER,
    user_id TEXT,
    content TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(post_id) REFERENCES posts(id),
    FOREIGN KEY(user_id) REFERENCES users(uid)
);
