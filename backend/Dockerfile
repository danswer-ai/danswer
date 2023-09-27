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

# install nodejs and replace nodejs packaged with playwright (18.17.0) with the one installed below 
# based on the instructions found here:
# https://nodejs.org/en/download/package-manager#debian-and-ubuntu-based-linux-distributions
# this is temporarily needed until playwright updates their packaged node version to
# 20.5.1+
RUN apt-get update
RUN apt-get install -y ca-certificates curl gnupg
RUN mkdir -p /etc/apt/keyrings
RUN curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
RUN echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list
RUN apt-get update
RUN apt-get install nodejs -y
# replace nodejs packaged with playwright (18.17.0) with the one installed above
RUN cp /usr/bin/node /usr/local/lib/python3.11/site-packages/playwright/driver/node
# remove nodejs (except for the binary we moved into playwright)
RUN apt-get remove -y nodejs

# Cleanup for CVEs and size reduction
RUN apt-get remove -y linux-libc-dev \
    && apt-get autoremove -y \
    && rm -rf /var/lib/apt/lists/*

# Remove tornado test key to placate vulnerability scanners
# More details can be found here:
# https://github.com/tornadoweb/tornado/issues/3107
RUN rm /usr/local/lib/python3.11/site-packages/tornado/test/test.key

WORKDIR /app
COPY ./danswer /app/danswer
COPY ./alembic /app/alembic
COPY ./alembic.ini /app/alembic.ini
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

WORKDIR /app/danswer/datastores/vespa/app_config
RUN zip -r /app/danswer/vespa-app.zip .
WORKDIR /app

# TODO: remove this once all users have migrated
COPY ./scripts/migrate_vespa_to_acl.py /app/migrate_vespa_to_acl.py

ENV PYTHONPATH /app

# By default this container does nothing, it is used by api server and background which specify their own CMD
CMD ["tail", "-f", "/dev/null"]
