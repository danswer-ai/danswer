from cryptography.hazmat.primitives import padding
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
from cryptography.hazmat.backends import default_backend
from os import urandom
import os
from enum import Enum

ENCRYPTION_KEY_SECRET = os.environ.get("ENCRYPTION_KEY_SECRET") or ""

def _get_trimmed_key(key: str) -> bytes:
    encoded_key = key.encode()
    key_length = len(encoded_key)
    if key_length < 16:
        raise RuntimeError("Invalid ENCRYPTION_KEY_SECRET - too short")
    elif key_length > 32:
        key = key[:32]
    elif key_length not in (16, 24, 32):
        valid_lengths = [16, 24, 32]
        key = key[: min(valid_lengths, key=lambda x: abs(x - key_length))]

    return encoded_key

def encrypt_string(input_str: str) -> bytes:
    if not ENCRYPTION_KEY_SECRET:
        return input_str.encode()

    key = _get_trimmed_key(ENCRYPTION_KEY_SECRET)
    iv = urandom(16)
    padder = padding.PKCS7(algorithms.AES.block_size).padder()
    padded_data = padder.update(input_str.encode()) + padder.finalize()

    cipher = Cipher(algorithms.AES(key), modes.CBC(iv), backend=default_backend())
    encryptor = cipher.encryptor()
    encrypted_data = encryptor.update(padded_data) + encryptor.finalize()

    return iv + encrypted_data

NUM_POSTPROCESSED_RESULTS = 20

class IndexModelStatus(str, Enum):
    PAST = "PAST"
    PRESENT = "PRESENT"
    FUTURE = "FUTURE"


class RecencyBiasSetting(str, Enum):
    FAVOR_RECENT = "favor_recent"  # 2x decay rate
    BASE_DECAY = "base_decay"
    NO_DECAY = "no_decay"
    # Determine based on query if to use base_decay or favor_recent
    AUTO = "auto"


class SearchType(str, Enum):
    KEYWORD = "keyword"
    SEMANTIC = "semantic"



class DocumentSource(str, Enum):
    # Special case, document passed in via Danswer APIs without specifying a source type
    INGESTION_API = "ingestion_api"
    SLACK = "slack"
    WEB = "web"
    GOOGLE_DRIVE = "google_drive"
    GMAIL = "gmail"
    REQUESTTRACKER = "requesttracker"
    GITHUB = "github"
    GITLAB = "gitlab"
    GURU = "guru"
    BOOKSTACK = "bookstack"
    CONFLUENCE = "confluence"
    SLAB = "slab"
    JIRA = "jira"
    PRODUCTBOARD = "productboard"
    FILE = "file"
    NOTION = "notion"
    ZULIP = "zulip"
    LINEAR = "linear"
    HUBSPOT = "hubspot"
    DOCUMENT360 = "document360"
    GONG = "gong"
    GOOGLE_SITES = "google_sites"
    ZENDESK = "zendesk"
    LOOPIO = "loopio"
    DROPBOX = "dropbox"
    SHAREPOINT = "sharepoint"
    TEAMS = "teams"
    SALESFORCE = "salesforce"
    DISCOURSE = "discourse"
    AXERO = "axero"
    CLICKUP = "clickup"
    MEDIAWIKI = "mediawiki"
    WIKIPEDIA = "wikipedia"
    S3 = "s3"
    R2 = "r2"
    GOOGLE_CLOUD_STORAGE = "google_cloud_storage"
    OCI_STORAGE = "oci_storage"
    NOT_APPLICABLE = "not_applicable"