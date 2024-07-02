import os

from dotenv import load_dotenv

load_dotenv()

__version__ = os.environ.get("DANSWER_VERSION", "") or "0.3-dev"
