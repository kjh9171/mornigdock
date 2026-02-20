# 🏗️ Stage 1: Build (Node.js)
FROM node:20-alpine AS build

WORKDIR /app

# 패키지 설치
COPY package*.json ./
RUN npm install

# 소스 복사 및 빌드
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# 🏗️ Stage 2: Serve (Nginx)
FROM nginx:stable-alpine

# 빌드 결과물 복사
COPY --from=build /app/dist /usr/share/nginx/html

# Nginx 설정 복사
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
