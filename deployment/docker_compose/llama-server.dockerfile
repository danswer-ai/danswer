FROM python:3-slim-bullseye

# We need to set the host to 0.0.0.0 to allow outside access
ENV HOST 0.0.0.0

# Install the package
RUN apt update && apt install -y libopenblas-dev ninja-build build-essential
RUN apt clean -y
RUN python -m pip install --no-cache-dir --upgrade pip
RUN python -m pip install \
	--no-cache-dir --upgrade \
	pytest cmake scikit-build setuptools fastapi uvicorn \
	sse-starlette
RUN LLAMA_OPENBLAS=1 python -m pip install \
	--no-cache-dir --upgrade \
	llama_cpp_python

# Run the server
CMD python3 -m llama_cpp.server
