FROM node:20-alpine

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
RUN npm ci --only=production || npm install

# 소스 코드 복사
COPY . .

# TypeScript 빌드 (선택사항)
# RUN npm run build

# 포트 노출
EXPOSE 8787

# 개발 모드로 실행
CMD ["npm", "run", "dev"]
