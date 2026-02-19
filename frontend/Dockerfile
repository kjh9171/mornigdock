# ✅ 개발 모드 - Vite dev server
FROM node:20-alpine

WORKDIR /app

# ✅ 패키지 설치 (캐시 최적화)
COPY package*.json ./
RUN npm install

# ✅ 소스 전체 복사
COPY . .

EXPOSE 5173

# ✅ Vite dev server - host 0.0.0.0 으로 Docker 외부 접근 허용
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]