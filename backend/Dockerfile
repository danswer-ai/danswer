FROM python:3.11-slim-bullseye

RUN apt-get update \
    && apt-get install -y git cmake pkg-config libprotobuf-c-dev protobuf-compiler libprotobuf-dev libgoogle-perftools-dev libpq-dev build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements/default.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /tmp/requirements.txt

WORKDIR /app
COPY ./danswer /app/danswer

ENV PYTHONPATH .
CMD ["uvicorn", "danswer.main:app", "--host", "0.0.0.0", "--port", "8080"]
