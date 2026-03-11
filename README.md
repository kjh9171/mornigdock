# Mornigdock (Agora v2.0) - Intelligence & News Hub

---

## Project Overview

Mornigdock (Agora v2.0)은 최신 뉴스 수집, AI 기반 분석, 그리고 커뮤니티 토론이 결합된 지능형 플랫폼입니다.
OTP 2단계 인증 및 JWT Refresh Token Rotation(RTR) 기술이 적용된 보안 플랫폼입니다.

### Key Features (v2.0)

- **보안**: OTP 2단계 인증, JWT Refresh Token Rotation (RTR), 실시간 계정 차단 검증
- **뉴스**: NewsAPI 연동 자동 수집 (Cron), 카테고리별 에러 격리, API 키 부재 시 Mock 데이터 생성
- **댓글**: 계층형 트리 구조 댓글 시스템, Soft Delete를 통한 트리 무결성 유지
- **미디어**: YouTube, 팟캐스트, 음악 등 멀티미디어 큐레이션 및 관리자 전용 관리 패널
- **관리자**: 시스템 설정 제어 (AI 활성/비활성, 수집 주기), 사용자 차단 및 역할 부여 대시보드
- **배포**: Cloudflare Workers 기반 서버리스 단일 배포 (프론트엔드 + 백엔드 통합)

---

## Tech Stack

| 구분               | 기술                                                           |
| ------------------ | -------------------------------------------------------------- |
| **Backend**        | Hono, Node.js, PostgreSQL (Neon Serverless), JWT, OTP (otplib) |
| **Frontend**       | React (Vite), Zustand, Axios, TailwindCSS                      |
| **Database**       | Neon (Serverless PostgreSQL)                                   |
| **Infrastructure** | Cloudflare Workers, Cloudflare Assets                          |
| **CI/CD**          | Cloudflare Pages CI (GitHub 연동)                              |

---

## Project Structure

```
mornigdock/
├── backend/
│   ├── src/
│   │   ├── db/
│   │   │   └── pool.ts          # Neon 서버리스 DB 클라이언트
│   │   ├── middleware/
│   │   │   └── auth.ts          # JWT 인증 미들웨어
│   │   ├── routes/
│   │   │   ├── auth.ts          # 인증 API
│   │   │   ├── news.ts          # 뉴스 API
│   │   │   ├── posts.ts         # 게시글 API
│   │   │   ├── comments.ts      # 댓글 API
│   │   │   ├── admin.ts         # 관리자 API
│   │   │   ├── media.ts         # 미디어 API
│   │   │   ├── stocks.ts        # 주식 API
│   │   │   ├── finance.ts       # 금융 API
│   │   │   ├── rss.ts           # RSS API
│   │   │   └── notifications.ts # 알림 API
│   │   ├── services/
│   │   │   ├── newsService.ts   # 뉴스 수집 서비스
│   │   │   └── geminiService.ts # AI 분석 서비스
│   │   ├── utils/
│   │   │   ├── settings.ts      # 시스템 설정
│   │   │   └── logger.ts        # 로거
│   │   ├── stockService.ts      # 주식 데이터 수집
│   │   └── index.ts             # 진입점
│   ├── scripts/
│   │   └── reset_data.ts        # 데이터 초기화 스크립트
│   ├── wrangler.toml            # Cloudflare Workers 설정
│   ├── tsconfig.json
│   └── package.json
├── frontend/
│   ├── src/
│   ├── public/
│   ├── vite.config.ts
│   └── package.json
├── schema.sql                   # DB 스키마 (Neon 초기화용)
├── package.json                 # 루트 (npm workspaces)
└── README.md
```

---

## Quick Start (로컬 개발)

### 1. 저장소 클론

```bash
git clone https://github.com/kjh9171/mornigdock.git
cd mornigdock
```

### 2. 의존성 설치

```bash
npm install
```

### 3. 환경 변수 설정

`backend/.env` 파일 생성:

```env
DATABASE_URL=postgresql://유저명:비밀번호@호스트/DB명?sslmode=require
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_refresh_secret_here
PORT=8787
NODE_ENV=development
FRONTEND_URL=http://localhost:5173
```

### 4. 데이터베이스 초기화

```bash
psql "postgresql://유저명:비밀번호@호스트/DB명?sslmode=require" -f schema.sql
```

### 5. 로컬 서버 실행

```bash
# 백엔드 개발 서버
cd backend && npm run dev

# 프론트엔드 개발 서버 (별도 터미널)
cd frontend && npm run dev
```

---

## Cloudflare Workers 배포

### 배포 구조

```
https://mornigdock.gimjonghwan319.workers.dev/
├── /api/*   → Hono 백엔드 API (Cloudflare Worker)
└── /*       → React SPA 정적 파일 (Cloudflare Assets)
```

### 초기 설정 (최초 1회)

#### 1. DB 스키마 적용 (Neon)

```bash
psql "postgresql://유저명:비밀번호@호스트/DB명?sslmode=require" -f schema.sql
```

#### 2. Cloudflare 대시보드에서 Secret 등록

**Workers & Pages → mornigdock → Settings → Variables and Secrets → `+ Add`**

| Name           | Type   | Value            |
| -------------- | ------ | ---------------- |
| `DATABASE_URL` | Secret | Neon 연결 문자열 |
| `JWT_SECRET`   | Secret | JWT 시크릿 값    |

> Secret Type을 반드시 **Secret** 으로 선택 (Plaintext 아님)

#### 3. 관리자 비밀번호 변경 (최초 배포 후 필수)

**Step 1 — 새 비밀번호의 bcrypt 해시 생성:**

```bash
node -e "import('bcryptjs').then(b => b.default.hash('새비밀번호입력', 12).then(h => console.log(h)))"
```

**Step 2 — Neon 대시보드 → SQL Editor 에서 실행:**

```sql
UPDATE users
SET password = '위에서_생성된_해시값'
WHERE email = '관리자이메일@example.com';
```

---

### Cloudflare 대시보드 빌드/배포 설정

**Workers & Pages → mornigdock → Settings → Build & deployments**

| 항목              | 값                                  |
| ----------------- | ----------------------------------- |
| **빌드 명령**     | `npm run build:all`                 |
| **배포 명령**     | `cd backend && npx wrangler deploy` |
| **루트 디렉토리** | `/` (비워두기)                      |

### `wrangler.toml` 주요 설정

```toml
name = "mornigdock"
main = "src/index.ts"
compatibility_date = "2025-03-10"
compatibility_flags = [ "nodejs_compat" ]

[define]
"process.env.WORKER" = '"true"'

[triggers]
crons = [ "0 * * * *" ]   # 매 시간 정각 자동 데이터 수집

[vars]
NODE_ENV = "production"
WORKER = "true"

[assets]
directory = "../frontend/dist"
binding = "ASSETS"
```

### 수동 배포

```bash
npm run build:all
cd backend && npx wrangler deploy
```

---

## API Specification

모든 API 응답 형식: `{ success: boolean, data?: object, message?: string }`

### 인증 (Auth)

| Endpoint               | Method | Role   | Description                          |
| ---------------------- | ------ | ------ | ------------------------------------ |
| `/api/auth/register`   | POST   | Public | 회원가입 및 OTP Secret 발급          |
| `/api/auth/login`      | POST   | Public | 로그인 (OTP 활성화 시 otpCode 필수)  |
| `/api/auth/refresh`    | POST   | Public | Access Token 갱신 (Refresh Rotation) |
| `/api/auth/me`         | GET    | User   | 내 정보 조회                         |
| `/api/auth/otp/enable` | POST   | User   | OTP 2단계 인증 활성화                |

### 뉴스 (News)

| Endpoint        | Method | Role   | Description                     |
| --------------- | ------ | ------ | ------------------------------- |
| `/api/news`     | GET    | Public | 뉴스 목록 (카테고리, 검색 지원) |
| `/api/news/:id` | GET    | Public | 뉴스 상세 조회                  |

### 게시글 (Posts)

| Endpoint                  | Method | Role   | Description                                |
| ------------------------- | ------ | ------ | ------------------------------------------ |
| `/api/posts`              | GET    | Public | 게시글 목록 (타입, 카테고리, 검색, 페이징) |
| `/api/posts`              | POST   | User   | 게시글 작성                                |
| `/api/posts/:id`          | GET    | Public | 게시글 상세 조회                           |
| `/api/posts/:id/reaction` | POST   | User   | 좋아요/싫어요                              |

### 댓글 (Comments)

| Endpoint            | Method | Role   | Description                    |
| ------------------- | ------ | ------ | ------------------------------ |
| `/api/comments`     | GET    | Public | 댓글 목록 (newsId 또는 postId) |
| `/api/comments`     | POST   | User   | 댓글/답글 작성 (parentId 지원) |
| `/api/comments/:id` | PUT    | User   | 댓글 수정                      |
| `/api/comments/:id` | DELETE | User   | 댓글 삭제 (Soft Delete)        |

### 관리자 (Admin)

| Endpoint                     | Method | Role    | Description                   |
| ---------------------------- | ------ | ------- | ----------------------------- |
| `/api/admin/dashboard`       | GET    | Admin   | 시스템 통계 및 최근 접속 로그 |
| `/api/admin/users`           | GET    | Admin   | 전체 사용자 목록              |
| `/api/admin/users`           | POST   | Admin   | 사용자 추가                   |
| `/api/admin/users/:id`       | PUT    | Admin   | 사용자 정보/권한 수정         |
| `/api/admin/users/:id`       | DELETE | Admin   | 사용자 삭제                   |
| `/api/admin/users/:id/block` | PUT    | Admin   | 계정 차단/해제                |
| `/api/admin/media`           | GET    | Admin   | 미디어 목록                   |
| `/api/admin/media`           | POST   | Admin   | 미디어 추가                   |
| `/api/admin/media/:id`       | PUT    | Editor+ | 미디어 수정                   |
| `/api/admin/media/:id`       | DELETE | Editor+ | 미디어 삭제                   |
| `/api/admin/settings`        | GET    | Admin   | 시스템 설정 조회              |
| `/api/admin/settings`        | PUT    | Admin   | 시스템 설정 변경              |
| `/api/admin/news`            | GET    | Admin   | 뉴스 관리 목록                |
| `/api/admin/posts`           | GET    | Admin   | 게시글 관리 목록              |
| `/api/admin/posts/:id`       | DELETE | Admin   | 게시글 삭제                   |
| `/api/admin/inquiries`       | GET    | Admin   | 문의글 목록                   |
| `/api/admin/inquiries/:id`   | PUT    | Admin   | 문의 상태 변경                |

### 헬스체크

| Endpoint      | Method | Description       |
| ------------- | ------ | ----------------- |
| `/api/health` | GET    | DB 연결 상태 확인 |

---

## Database Schema (Neon PostgreSQL)

| 테이블            | 설명                          |
| ----------------- | ----------------------------- |
| `users`           | 사용자 (OTP, 역할, 차단 여부) |
| `refresh_tokens`  | JWT Refresh Token             |
| `news`            | 수집된 뉴스                   |
| `posts`           | 커뮤니티 게시글               |
| `comments`        | 계층형 댓글                   |
| `reactions`       | 좋아요/싫어요                 |
| `media`           | YouTube/팟캐스트/음악         |
| `inquiries`       | 문의글                        |
| `access_logs`     | 접속 로그                     |
| `system_settings` | 시스템 설정                   |
| `stocks`          | 주식/금융 데이터              |
| `notifications`   | 사용자 알림                   |

---

## Security Policy

1. 모든 인증 요청은 미들웨어에서 DB를 실시간 조회하여 차단 여부를 검증합니다.
2. 비밀번호 변경 시 해당 사용자의 모든 Refresh Token을 즉시 삭제하여 강제 로그아웃시킵니다.
3. Access Token 만료 시 프론트엔드 Axios 인터셉터가 자동으로 갱신을 시도하며, 진행 중인 요청들은 큐잉(Queueing) 처리됩니다.
4. OTP 2단계 인증으로 계정 탈취를 방지합니다.
5. Cloudflare Workers Secrets로 민감한 환경변수를 안전하게 관리합니다.

---

## npm Scripts

```bash
# 루트
npm run build:all        # 프론트엔드 + 백엔드 전체 빌드
npm run build:frontend   # 프론트엔드만 빌드
npm run build:backend    # 백엔드만 빌드 (tsc)

# 백엔드 (cd backend)
npm run dev              # 로컬 개발 서버 (tsx watch)
npm run deploy           # Cloudflare Workers 배포
npm run worker:dev       # Wrangler 로컬 개발 서버
npm run fetch-news       # 뉴스 수동 수집
npm run fetch-stocks     # 주식 데이터 수동 수집
```

---

## Troubleshooting

### DB 연결 실패 (`db: false`)

1. Cloudflare 대시보드 **Variables and Secrets** 에 `DATABASE_URL` Secret이 있는지 확인
2. Secret Type이 **Secret** (Plaintext 아님) 인지 확인
3. Neon 연결 문자열에 `?sslmode=require` 포함 여부 확인

### 로그인 오류

1. `/api/health` 에서 `db: true` 확인
2. Neon DB의 `users` 테이블에 계정 존재 여부 확인
3. 비밀번호가 bcrypt 해시로 저장되어 있는지 확인

### 배포 실패

```bash
# Secret 등록 확인
cd backend && npx wrangler secret list

# 실시간 로그 확인
npx wrangler tail
```

---

## Live URL

| 서비스         | URL                                                      |
| -------------- | -------------------------------------------------------- |
| **서비스**     | https://mornigdock.gimjonghwan319.workers.dev            |
| **API Health** | https://mornigdock.gimjonghwan319.workers.dev/api/health |

---

## Contribution, CERT

Copyright (c) 2026 CERT. All rights reserved.
