#!/bin/bash

# Change to parent directory
cd ..

# Activate virtual environment
source .venv/bin/activate

# Install requirements
pip install -r ConversationalHealthPlatform/backend/requirements/default.txt
pip install -r ConversationalHealthPlatform/backend/requirements/dev.txt
pip install -r ConversationalHealthPlatform/backend/requirements/model_server.txt
pip install -r ConversationalHealthPlatform/backend/requirements/ee.txt
pip install -r ConversationalHealthPlatform/backend/requirements/cdk.txt

# Change to ConversationalHealthPlatform directory
cd ConversationalHealthPlatform