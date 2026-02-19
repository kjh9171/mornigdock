FROM node:20-alpine

WORKDIR /app

# 의존성 파일 복사 및 설치
COPY package*.json ./
# 개발 환경이므로 모든 의존성(tsx 등 포함) 설치
RUN npm install

# 소스 코드 복사
COPY . .

# 포트 노출
EXPOSE 8787

# 개발 모드로 실행
CMD ["npm", "run", "dev"]
