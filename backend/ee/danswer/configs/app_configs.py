import os

# Applicable for OIDC Auth
OPENID_CONFIG_URL = os.environ.get("OPENID_CONFIG_URL", "")

# Applicable for SAML Auth
SAML_CONF_DIR = os.environ.get("SAML_CONF_DIR") or "/app/ee/danswer/configs/saml_config"
