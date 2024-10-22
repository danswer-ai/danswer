#!/bin/bash

# Change to parent directory
cd ..

# Activate virtual environment
source .venv/bin/activate

# Install requirements
pip install -r enmedd-ai/backend/requirements/default.txt
pip install -r enmedd-ai/backend/requirements/dev.txt
pip install -r enmedd-ai/backend/requirements/model_server.txt
pip install -r enmedd-ai/backend/requirements/ee.txt
pip install -r enmedd-ai/backend/requirements/cdk.txt

# Change to enmedd-ai directory
cd enmedd-ai