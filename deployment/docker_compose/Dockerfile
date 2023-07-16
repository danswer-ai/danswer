FROM python:3-slim-bullseye

RUN apt update && apt install -y python3 python3-pip git
RUN apt clean -y

RUN python -m pip install --no-cache-dir --upgrade \
	pip setuptools wheel

# CPU inference only
RUN pip install --no-cache-dir --upgrade \
    --index-url https://download.pytorch.org/whl/cpu \
    torch torchvision torchaudio

RUN python -m pip install --no-cache-dir --upgrade \
	git+https://github.com/lm-sys/FastChat.git