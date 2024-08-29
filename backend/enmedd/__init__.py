import os

from dotenv import load_dotenv

load_dotenv()

# TODO: replace the env variable name
__version__ = os.environ.get("ENMEDD_VERSION", "") or "0.3-dev"
