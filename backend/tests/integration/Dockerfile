FROM python:3.11.7-slim-bookworm
# Dockerfile for integration tests
# Currently needs all dependencies, since the ITs use some of the Danswer
# backend code.

# Add Docker's official GPG key and repository for Debian
RUN apt-get update && \
    apt-get install -y ca-certificates curl && \
    install -m 0755 -d /etc/apt/keyrings && \
    curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc && \
    chmod a+r /etc/apt/keyrings/docker.asc && \
    echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
    $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
    tee /etc/apt/sources.list.d/docker.list > /dev/null && \
    apt-get update


# Install system dependencies
# cmake needed for psycopg (postgres)
# libpq-dev needed for psycopg (postgres)
# curl included just for users' convenience
# zip for Vespa step futher down
# ca-certificates for HTTPS
RUN apt-get update && \
    apt-get install -y \
        cmake \
        curl \
        zip \
        ca-certificates \
        postgresql-client \
        # Install Docker for DinD
        docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin \
        libgnutls30=3.7.9-2+deb12u3 \
        libblkid1=2.38.1-5+deb12u1 \
        libmount1=2.38.1-5+deb12u1 \
        libsmartcols1=2.38.1-5+deb12u1 \
        libuuid1=2.38.1-5+deb12u1 \
        libxmlsec1-dev \
        pkg-config \
        gcc && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# Install Python dependencies
# Remove py which is pulled in by retry, py is not needed and is a CVE
COPY ./requirements/default.txt /tmp/requirements.txt
COPY ./requirements/model_server.txt /tmp/model_server-requirements.txt
COPY ./requirements/ee.txt /tmp/ee-requirements.txt
RUN pip install --no-cache-dir --upgrade \
        --retries 5 \
        --timeout 30 \
        -r /tmp/requirements.txt \
        -r /tmp/model_server-requirements.txt \
        -r /tmp/ee-requirements.txt && \
    pip uninstall -y py && \
    playwright install chromium && \
    playwright install-deps chromium && \
    ln -s /usr/local/bin/supervisord /usr/bin/supervisord

# Set up application files
WORKDIR /app

# Enterprise Version Files
COPY ./ee /app/ee
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set up application files
COPY ./danswer /app/danswer
COPY ./shared_configs /app/shared_configs
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini
COPY ./pytest.ini /app/pytest.ini
COPY supervisord.conf /usr/etc/supervisord.conf

# need to copy over model server as well, since we're running it in the same container
COPY ./model_server /app/model_server

# Integration test stuff
COPY ./requirements/dev.txt /tmp/dev-requirements.txt
RUN pip install --no-cache-dir --upgrade \
        -r /tmp/dev-requirements.txt
COPY ./tests/integration /app/tests/integration

ENV PYTHONPATH=/app

ENTRYPOINT []
CMD ["pytest", "-s", "/app/tests/integration", "--ignore=/app/tests/integration/multitenant_tests"]