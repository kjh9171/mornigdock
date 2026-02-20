# 🏛️ Agora v2.0 - Intelligence & News Hub

---

## 📁 Project Overview
Mornigdock (Agora v2.0)은 최신 뉴스 수집, AI 기반 분석, 그리고 커뮤니티 토론이 기가 막히게 결합된 지능형 플랫폼입니다.
CERT 보안 총괄이 직접 설계한 OTP 및 JWT Refresh Token Rotation(RTR) 기술이 적용되어 철통 보안을 자랑합니다!

### 🚀 Key Features (v2.0 고도화)
- 🔐 보안: OTP 2단계 인증, JWT Refresh Token Rotation (RTR), 실시간 계정 차단 검증.
- 📰 뉴스: NewsAPI 연동 자동 수집(Cron), 카테고리별 에러 격리, API 키 부재 시 Mock 데이터 생성.
- 💬 댓글: 계층형 트리 구조(Hierarchical) 댓글 시스템, Soft Delete를 통한 트리 무결성 유지.
- 📺 미디어: 유튜브, 팟캐스트, 음악 등 멀티미디어 큐레이션 및 관리자 전용 관리 패널.
- 🛡️ 관리자: 시스템 설정 제어(AI 활성/비활성, 수집 주기), 사용자 차단 및 역할 부여 대시보드.
- 🐋 배포: Docker Compose 기반의 서버리스 환경, Nginx Multi-stage 빌드 및 SPA 라우팅 최적화.

---

## 🛠️ Tech Stack
- Backend: Hono (Node.js/Bun compatible), PostgreSQL (pg), JWT, OTP (otplib).
- Frontend: React (Vite), Zustand (State Management), Axios (with Retry Queue Interceptors), TailwindCSS.
- Infrastructure: Docker, Docker Compose, Nginx, Cloudflare Tunnel (optional).

---

## 🏁 Quick Start

### 1. 환경 변수 설정
.env.example 파일을 복사하여 .env 파일을 생성합니다.
```bash
cp .env.example .env
```
필수 설정 항목:
- JWT_SECRET, JWT_REFRESH_SECRET: 강력한 비밀번호로 변경 권장.
- DATABASE_URL: postgresql://agora:agora_secret_2024@db:5432/agora_db (기본값).
- NEWS_API_KEY: NewsAPI.org에서 발급받은 키 (없으면 Mock 데이터로 동작).

### 2. 서비스 실행 (Docker)
```bash
# 일반 모드 실행
docker-compose up -d --build

# Cloudflare Tunnel 포함 실행
docker-compose --profile cloudflare up -d --build
```

### 3. 초기 접속 정보
- 프론트엔드: http://localhost (80 포트)
- API 서버: http://localhost:8787
- 관리자 계정: admin@agora.com / Admin@1234! (로그인 후 즉시 비밀번호 변경 권장)

---

## 📡 API Specification (Brief)
모든 API 응답은 { success: boolean, data: object, message?: string } 형식을 따릅니다.

| Endpoint | Method | Role | Description |
|----------|--------|------|-------------|
| /api/auth/register | POST | Public | 회원가입 및 OTP Secret 발급 |
| /api/auth/login | POST | Public | 로그인 (OTP 활성화 시 otpCode 필수) |
| /api/auth/refresh | POST | Public | Access Token 갱신 (Refresh Rotation) |
| /api/news | GET | Public | 뉴스 목록 (카테고리, 검색 지원) |
| /api/comments | POST | User | 댓글 및 답글 작성 (parentId 지원) |
| /api/admin/dashboard | GET | Admin | 시스템 통계 및 최근 접속 로그 |

---

## 🛡️ Security Policy
1. 모든 인증 요청은 미들웨어에서 DB를 실시간 조회하여 차단 여부를 검증합니다.
2. 비밀번호 변경 시 해당 사용자의 모든 Refresh Token을 즉시 삭제하여 강제 로그아웃 시킵니다.
3. Access Token 만료 시 프론트엔드 Axios 인터셉터가 자동으로 갱신을 시도하며, 진행 중인 요청들은 큐잉(Queueing) 처리됩니다.

---

## 🏗️ Deployment
Nginx를 활용한 SPA 최적화 설정이 적용되어 있으며, try_files 구문을 통해 React Router의 새로고침 이슈를 기가 막히게 해결했습니다.
Docker Compose의 healthcheck 설정을 통해 DB 부팅 완료 후 백엔드가 시작되도록 설계되었습니다.

---

## 🤝 Contribution
안티그래비티 개발총괄 'CERT' 
Copyright (c) 2026 Antigravity. All rights reserved.
