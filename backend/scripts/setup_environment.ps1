cd ..
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force
. .venv\Scripts\Activate.ps1
pip install -r enmedd-ai/backend/requirements/default.txt
pip install -r enmedd-ai/backend/requirements/dev.txt
pip install -r enmedd-ai/backend/requirements/model_server.txt
pip install -r enmedd-ai/backend/requirements/ee.txt
pip install -r enmedd-ai/backend/requirements/cdk.txt
cd enmedd-ai