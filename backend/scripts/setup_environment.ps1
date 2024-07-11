cd ..
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
. .venv\Scripts\Activate.ps1
pip install -r ConversationalHealthPlatform/backend/requirements/default.txt
pip install -r ConversationalHealthPlatform/backend/requirements/dev.txt
pip install -r ConversationalHealthPlatform/backend/requirements/model_server.txt
pip install -r ConversationalHealthPlatform/backend/requirements/ee.txt
pip install -r ConversationalHealthPlatform/backend/requirements/cdk.txt
cd ConversationalHealthPlatform