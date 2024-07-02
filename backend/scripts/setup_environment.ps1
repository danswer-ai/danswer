# Change to the parent directory
cd ..

# Set the execution policy to Bypass for the current process
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process -Force

# Activate the virtual environment
. .venv\Scripts\Activate.ps1

# Change to the ConversationalHealthPlatform directory
cd ConversationalHealthPlatform