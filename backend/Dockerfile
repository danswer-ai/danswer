FROM nvidia/cuda:12.2.2-devel-ubuntu22.04

# Install system dependencies
RUN apt-get update && \
    apt-get install -y git cmake pkg-config libprotobuf-c-dev protobuf-compiler \
       libprotobuf-dev libgoogle-perftools-dev libpq-dev build-essential cron curl \
       supervisor zip ca-certificates gnupg && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get clean

# RUN apt-get update && \
#     apt-get install -y build-essential checkinstall \ 
#     libreadline-gplv2-dev libncursesw5-dev libssl-dev \
#     libsqlite3-dev tk-dev libgdbm-dev libc6-dev libbz2-dev 
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y tzdata
RUN apt-get update && \
    apt-get install software-properties-common -y && \
    add-apt-repository ppa:deadsnakes/ppa && \
    apt-get install python3.11-dev python3.11-distutils -y && \
    curl -sS https://bootstrap.pypa.io/get-pip.py | python3.11


# Install Python dependencies
# Remove py which is pulled in by retry, py is not needed and is a CVE
COPY ./requirements/default.txt /tmp/requirements.txt
RUN pip install --no-cache-dir --upgrade -r /tmp/requirements.txt && \
    pip uninstall -y py && \
    playwright install chromium && \
    playwright install-deps chromium

# install nodejs and replace nodejs packaged with playwright (18.17.0) with the one installed below
# based on the instructions found here:
# https://nodejs.org/en/download/package-manager#debian-and-ubuntu-based-linux-distributions
# this is temporarily needed until playwright updates their packaged node version to
# 20.5.1+
# RUN mkdir -p /etc/apt/keyrings && \
#     curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg && \
#     echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list && \
#     apt-get update && \
#     apt-get install -y nodejs && \
#     cp /usr/bin/node /usr/local/lib/python3.11/site-packages/playwright/driver/node && \
#     apt-get remove -y nodejs

# Cleanup for CVEs and size reduction
# Remove tornado test key to placate vulnerability scanners
# More details can be found here:
# https://github.com/tornadoweb/tornado/issues/3107
# RUN apt-get remove -y linux-libc-dev && \
#     apt-get autoremove -y && \
#     rm -rf /var/lib/apt/lists/* && \
#     rm /usr/local/lib/python3.11/site-packages/tornado/test/test.key

# Set up application files
WORKDIR /app
COPY ./danswer /app/danswer
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create Vespa app zip
WORKDIR /app/danswer/document_index/vespa/app_config
RUN zip -r /app/danswer/vespa-app.zip .
WORKDIR /app

# TODO: remove this once all users have migrated
COPY ./scripts/migrate_vespa_to_acl.py /app/migrate_vespa_to_acl.py

ENV PYTHONPATH /app

RUN ln -s /usr/bin/python3.11 /usr/bin/python & \
    ln -s /usr/bin/pip3.11 /usr/bin/pip

# Default command which does nothing
# This container is used by api server and background which specify their own CMD
CMD ["tail", "-f", "/dev/null"]
