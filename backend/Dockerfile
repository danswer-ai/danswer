FROM python:3.11.7-slim-bookworm

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
COPY ./requirements/ee.txt /tmp/ee-requirements.txt
RUN pip install --no-cache-dir --upgrade \
        -r /tmp/requirements.txt \
        -r /tmp/ee-requirements.txt && \
    pip uninstall -y py && \
    playwright install chromium && \
    playwright install-deps chromium && \
    ln -s /usr/local/bin/supervisord /usr/bin/supervisord

# Cleanup for CVEs and size reduction
# https://github.com/tornadoweb/tornado/issues/3107
# xserver-common and xvfb included by playwright installation but not needed after
# perl-base is part of the base Python Debian image but not needed for enMedD AI functionality
# perl-base could only be removed with --allow-remove-essential
RUN apt-get update && \
    apt-get remove -y --allow-remove-essential \
        perl-base \
        xserver-common \
        xvfb \
        cmake \
        libldap-2.5-0 \
        libxmlsec1-dev \
        pkg-config \
        gcc && \
    apt-get install -y libxmlsec1-openssl && \
    apt-get autoremove -y && \
    rm -rf /var/lib/apt/lists/* && \
    rm -f /usr/local/lib/python3.11/site-packages/tornado/test/test.key

# Pre-downloading models for setups with limited egress
RUN python -c "from transformers import AutoTokenizer; AutoTokenizer.from_pretrained('intfloat/e5-base-v2')"

# Pre-downloading NLTK for setups with limited egress
RUN python -c "import nltk; \
nltk.download('stopwords', quiet=True); \
nltk.download('wordnet', quiet=True); \
nltk.download('punkt', quiet=True);"

# Set up application files
WORKDIR /app

# Enterprise Version Files
COPY ./ee /app/ee
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Set up application files
COPY ./enmedd /app/enmedd
COPY ./shared_configs /app/shared_configs
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini
COPY supervisord.conf /usr/etc/supervisord.conf

# Escape hatch
COPY ./scripts/force_delete_connector_by_id.py /app/scripts/force_delete_connector_by_id.py

# Put logo in assets
COPY ./assets /app/assets

ENV PYTHONPATH /app

EXPOSE 8080

# Default command which does nothing
# This container is used by api server and background which specify their own CMD
CMD ["tail", "-f", "/dev/null"]
