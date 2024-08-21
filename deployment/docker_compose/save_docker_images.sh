#!/bin/bash
echo "Saving docudive/nginx:v1"
docker image save -o /elk/docudive/docudive_nginx_v1.tar docudive/nginx:v1
echo "Saving docudive/web_server:v1"
docker image save -o /elk/docudive/docudive_web_server_v1.tar docudive/web_server:v1
echo "Saving docudive/background:v1"
docker image save -o /elk/docudive/docudive_background_v1.tar docudive/background:v1
echo "Saving docudive/api_server:v1"
docker image save -o /elk/docudive/docudive_api_server_v1.tar docudive/api_server:v1
echo "Saving docudive/inference_server:v1"
docker image save -o /elk/docudive/docudive_inference_server_v1.tar docudive/inference_server:v1
echo "Saving docudive/relational_db:v1"
docker image save -o /elk/docudive/docudive_relational_db_v1.tar docudive/relational_db:v1
echo "Saving docudive/indexing_server:v1"
docker image save -o /elk/docudive/docudive_indexing_server_v1.tar docudive/indexing_server:v1
echo "Saving docudive/vespa_index:v1"
docker image save -o /elk/docudive/docudive_vespa_index_v1.tar docudive/vespa_index:v1
echo "Saving docudive/langfuse:v1"
docker image save -o /elk/docudive/docudive_langfuse_v1.tar docudive/langfuse:v1