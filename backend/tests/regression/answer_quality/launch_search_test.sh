#!/bin/bash

export PYTHONPATH="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd):$PYTHONPATH"
export MODEL_SERVER_HOST="18.218.165.17" 
export MODEL_SERVER_PORT="80" 

python3.11 backend/tests/regression/answer_quality/search_quality_test.py