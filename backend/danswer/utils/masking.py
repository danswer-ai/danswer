from detect_secrets import SecretsCollection
from detect_secrets.settings import default_settings
import tempfile
import os

def find_and_mask_secrets(text):
    with tempfile.NamedTemporaryFile(delete=False) as tmp_file:
        tmp_file.write(text.encode())
        tmp_file_path = tmp_file.name

    # Scan the temporary file
    with default_settings() as settings:
        secrets = SecretsCollection()
        secrets.scan_file(tmp_file_path)
    
    # Read back the secrets and mask them
    masked_text = text
    for secret in secrets:
        secret_value = secret[1].secret_value
        masked_text = masked_text.replace(secret_value, '[MASKED]')
    
    # Clean up the temporary file
    os.remove(tmp_file_path)
    
    return masked_text
