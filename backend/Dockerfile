FROM python:3.11-slim-bullseye

RUN apt-get update \
    && apt-get install -y git cmake pkg-config libprotobuf-c-dev protobuf-compiler \ 
       libprotobuf-dev libgoogle-perftools-dev libpq-dev build-essential curl \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements/default.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /tmp/requirements.txt

WORKDIR /app
COPY ./danswer /app/danswer
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini

ENV PYTHONPATH /app
CMD ["/bin/sh", "-c", "alembic upgrade head && echo \"Starting Danswer Api Server\" && uvicorn danswer.main:app --host 0.0.0.0 --port 8080"]
