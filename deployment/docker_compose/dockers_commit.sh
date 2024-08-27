#!/bin/bash

docker commit docudive-stack-nginx-1 docudive/nginx:v1	
docker commit docudive-stack-web_server-1 docudive/web_server:v1
docker commit docudive-stack-background-1 docudive/background:v1
docker commit docudive-stack-api_server-1 docudive/api_server:v1
docker commit docudive-stack-inference_model_server-1 docudive/inference_server:v1
docker commit docudive-stack-relational_db-1 docudive/relational_db:v1
docker commit docudive-stack-indexing_model_server-1 docudive/indexing_server:v1
docker commit docudive-stack-index-1 docudive/vespa_index:v1
docker commit docudive-stack-langfuse-1 docudive/langfuse:v1