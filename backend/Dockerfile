# 파이썬 3.10 버전의 경량화된 이미지를 사용합니다. (이미지 크기 축소!)
FROM python:3.10-slim

# 컨테이너 내에서 작업할 디렉토리를 설정합니다.
WORKDIR /app

# 파이썬이 .pyc 파일을 생성하지 않도록 하고, 버퍼링 없이 로그를 출력하게 설정합니다.
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 의존성 파일을 먼저 복사합니다. (빌드 속도 최적화)
COPY requirements.txt .

# pip를 최신으로 업데이트하고 필요한 라이브러리들을 설치합니다.
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 현재 폴더의 모든 소스 코드를 컨테이너 내부로 복사합니다.
COPY . .

# 클라우드플레어 터널이 바라볼 8000번 포트를 열어줍니다.
EXPOSE 8000

# FastAPI(uvicorn)를 실행합니다.
# --proxy-headers: 클라우드플레어를 거쳐오는 사용자의 실제 IP를 인식하기 위해 필수입니다!
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]