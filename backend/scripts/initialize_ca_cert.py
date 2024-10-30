import os
import shutil
import subprocess
import sys

# Check if the CA certificate file exists
ca_cert_path = "/etc/ssl/certs/my-ca.crt"
if os.path.isfile(ca_cert_path):
    print("Adding custom CA certificate")
    dest_path = "/usr/local/share/ca-certificates/my-ca.crt"
    shutil.copy2(ca_cert_path, dest_path)
    os.chmod(dest_path, 0o644)
    subprocess.run(["update-ca-certificates"], check=True)
else:
    print("No custom CA certificate provided")

# Execute the main command
os.execvp(sys.argv[1], sys.argv[1:])
