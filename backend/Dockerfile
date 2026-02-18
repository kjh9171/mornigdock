# ✅ 개발 모드 Dockerfile (tsx watch로 실행)
FROM node:20-alpine

WORKDIR /app

# ✅ 패키지 먼저 복사 후 설치 (캐시 최적화)
COPY package*.json ./
RUN npm install

# ✅ 소스 복사
COPY . .

EXPOSE 8787

# ✅ tsx watch로 개발 서버 실행
CMD ["npm", "run", "dev"]