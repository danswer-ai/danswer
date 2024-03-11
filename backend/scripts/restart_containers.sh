#!/bin/bash

# Stop and remove the existing containers
echo "Stopping and removing existing containers..."
docker stop danswer_postgres danswer_vespa
docker rm danswer_postgres danswer_vespa

# Start the PostgreSQL container
echo "Starting PostgreSQL container..."
docker run -p 5432:5432 --name danswer_postgres -e POSTGRES_PASSWORD=password -d postgres

# Start the Vespa container
echo "Starting Vespa container..."
docker run --detach --name danswer_vespa --hostname vespa-container --publish 8081:8081 --publish 19071:19071 vespaengine/vespa:8

# Ensure alembic runs in the correct directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PARENT_DIR"

# Run Alembic upgrade
echo "Running Alembic migration..."
alembic upgrade head

echo "Containers restarted and migration completed."
