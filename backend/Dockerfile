FROM python:3.11.7-slim-bookworm

# Default DANSWER_VERSION, typically overriden during builds by GitHub Actions.
ARG DANSWER_VERSION=0.2-dev
ENV DANSWER_VERSION=${DANSWER_VERSION}
RUN echo "DANSWER_VERSION: ${DANSWER_VERSION}"

# Install system dependencies
# cmake needed for psycopg (postgres)
# libpq-dev needed for psycopg (postgres)
# curl included just for users to be able to debug
# supervisor for supervisord
# zip for Vespa step futher down
# ca-certificates for HTTPS
RUN apt-get update && \
    apt-get install -y cmake libpq-dev curl supervisor zip ca-certificates && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Install Python dependencies
# Remove py which is pulled in by retry, py is not needed and is a CVE
COPY ./requirements/default.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /tmp/requirements.txt && \
    pip uninstall -y py && \
    playwright install chromium && \
    playwright install-deps chromium

# Cleanup for CVEs and size reduction
# https://github.com/tornadoweb/tornado/issues/3107
# xserver-common and xvfb included by playwright installation but not needed after
RUN apt-get remove -y --allow-remove-essential cmake perl-base xserver-common xvfb && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    rm /usr/local/lib/python3.11/site-packages/tornado/test/test.key

# Set up application files
WORKDIR /app
COPY ./danswer /app/danswer
COPY ./shared_models /app/shared_models
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create Vespa app zip
WORKDIR /app/danswer/document_index/vespa/app_config
RUN zip -r /app/danswer/vespa-app.zip .
WORKDIR /app

ENV PYTHONPATH /app

# Default command which does nothing
# This container is used by api server and background which specify their own CMD
CMD ["tail", "-f", "/dev/null"]
