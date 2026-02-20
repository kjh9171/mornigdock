# Node.js 20 경량 이미지 사용 (사령부 표준 연료)
FROM node:20-alpine

# 컨테이너 내 작업 디렉토리 설정
WORKDIR /app

# 패키지 명세서 복사 (캐시 최적화)
COPY package*.json ./

# 의존성 보급 (npm install)
RUN npm install

# 전체 소스 코드 보급
COPY . .

# 아고라 백엔드 표준 포트 개방
EXPOSE 8787

# 백엔드 엔진 점화 (tsx watch 모드)
CMD ["npm", "run", "dev"]
