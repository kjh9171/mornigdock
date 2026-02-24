# 🏗️ Stage 1: Build (Node.js)
FROM node:20-alpine AS build

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 복사
COPY . .

# 빌드 오류 해결을 위한 추가 클린업 및 재설치 (최후의 수단, 이제 Login.tsx 파일 삭제 명령은 필요 없음)
RUN npm cache clean --force
RUN rm -rf node_modules dist
RUN npm install

ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 🏗️ Stage 2: Serve (Nginx)
FROM nginx:stable-alpine

# 빌드 결과물 복사
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 설정 복사
# docker-compose.yml에서 볼륨 마운트하므로 여기서 복사할 필요는 없음
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
