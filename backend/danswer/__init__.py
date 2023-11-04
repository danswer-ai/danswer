import os

# Pulls the version from the environment variable DANSWER_VERSION, or defaults to 0.1.0dev.
__version__ = os.environ.get("DANSWER_VERSION", "") or "0.1.0dev"