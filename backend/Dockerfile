FROM python:3.11.4-slim-bookworm

RUN apt-get update \
    && apt-get install -y git cmake pkg-config libprotobuf-c-dev protobuf-compiler \
       libprotobuf-dev libgoogle-perftools-dev libpq-dev build-essential cron curl \
       supervisor zip \
    && rm -rf /var/lib/apt/lists/*

COPY ./requirements/default.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /tmp/requirements.txt

# Remove py which is pulled in by retry, py is not needed and is a CVE
RUN pip uninstall -y py

RUN playwright install chromium
RUN playwright install-deps chromium

# Cleanup for CVEs and size reduction
RUN apt-get remove -y linux-libc-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY ./danswer /app/danswer
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

WORKDIR /app/danswer/datastores/vespa/app_config
RUN zip -r /app/danswer/vespa-app.zip .
WORKDIR /app

ENV PYTHONPATH /app

# By default this container does nothing, it is used by api server and background which specify their own CMD
CMD ["tail", "-f", "/dev/null"]
