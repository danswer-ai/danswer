#!/bin/bash
docker compose -f docker-compose.dev.new.gpu.yml -p docudive-stack build web_server
