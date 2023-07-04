FROM python:3-slim-bullseye

RUN apt update && apt install -y python3 python3-pip
RUN apt clean -y

RUN python -m pip install --no-cache-dir --upgrade pip
RUN python -m pip install --no-cache-dir --upgrade fschat
