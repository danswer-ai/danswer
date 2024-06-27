#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if Git is installed
if ! command_exists git; then
    echo "Git is not installed. Please install Git and try again."
    exit 1
fi

# Check if Docker is installed and running
if ! command_exists docker; then
    echo "Docker is not installed. Please install Docker Desktop and try again."
    exit 1
fi

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Check if Docker Compose is installed
if ! command_exists docker-compose; then
    echo "Docker Compose is not installed. Please install Docker Compose and try again."
    exit 1
fi

# Repository URL
REPO_URL="https://github.com/danswer-ai/danswer.git"

# Clone the repository
git clone $REPO_URL
cd danswer

# Run Docker Compose
docker-compose -f ./deployment/docker_compose/docker-compose.dev.yml -p danswer-stack up -d --build --force-recreate

echo "Setup complete! Danswer should now be running."
echo "Please visit http://localhost:3000 to check out the product. We hope you enjoy. Visit danswer.ai to learn more"