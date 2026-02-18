# ✅ 개발 모드 Dockerfile - Vite dev server 사용
FROM node:20-alpine

WORKDIR /app

# ✅ 패키지 먼저 복사 후 설치 (캐시 최적화)
COPY package*.json ./
RUN npm install

# ✅ 소스 복사
COPY . .

EXPOSE 5173

# ✅ Vite dev server 실행 (--host 필수: Docker 외부에서 접근 가능하게)
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]