# Use an official Node runtime as a parent image
FROM nvidia/cuda:12.1.1-devel-ubuntu22.04

#remove any third-party apt sources to avoid issues with expiring keys
RUN rm -f /etc/apt/sources.list.d/*.list

#Install some basic utilities
RUN apt-get update && apt-get install -y \
    curl \
	ca-certificates \
	sudo \
	vim \
	supervisor \
	git \
	bzip2 \
	libx11-6 \
 &&	rm -rf /var/lib/apt/lists/*

# Create a working directory
RUN mkdir /code
COPY . /code
WORKDIR /code

# Create a non-root user and switch to it
RUN adduser --disabled-password --gecos '' --shell /bin/bash user \
 && chown -R user:user /code
RUN echo "user ALL=(All) NOPASSWD:ALL" > /etc/sudoers.d/90-user 
USER user

# All users can use /home/user as their home directory
ENV HOME=/home/user
RUN chmod 777 /home/user

# Install Miniconda and python 3.8
ENV CONDA_AUTO_UPDATE_CONDA=false
ENV PATH=/home/user/miniconda/bin:$PATH
RUN curl -sLo ~/miniconda.sh https://repo.continuum.io/miniconda/Miniconda3-py39_23.5.2-0-Linux-x86_64.sh \
 && chmod +x ~/miniconda.sh \
 && ~/miniconda.sh -b -p ~/miniconda \
 && rm ~/miniconda.sh \
 && conda install -y python=3.9 \
 && conda clean -ya
 

RUN conda install pytorch torchvision torchaudio pytorch-cuda=12.1 -c pytorch -c nvidia
#RUN conda install pytorch==2.0.1 torchvision==0.15.2 torchaudio==2.0.2 pytorch-cuda=11.7 -c pytorch -c nvidia

RUN pip install transformers==4.37.2

#RUN pip install pandas jupyter
RUN pip install fschat==0.2.36 sentencepiece protobuf accelerate vllm==0.2.7 triton