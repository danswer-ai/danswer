from playwright.sync_api import Page
from danswer.utils.logger import setup_logger

logger = setup_logger()

class Credentials:
    tenant_url: str
    username: str
    password: str

    def __init__(self, tenant_url: str, username: str, password: str):
        self.tenant_url = tenant_url
        self.username = username
        self.password = password

    def is_login_url(self, url: str) -> bool:
        return url.startswith(self.tenant_url)

def do_login(page: Page, creds: Credentials):
    logger.info("Waiting for network idle")
    page.wait_for_load_state("networkidle")

    if not page.url.startswith(creds.tenant_url):
        raise "Can't login with Okta credentials outside of the Okta tenant URL"

    logger.info(f"Logging in to tenant {creds.tenant_url} as {creds.username}")
    page.type('input[name="identifier"]', creds.username)

    logger.info("Confirmed we're logging in to the Okta tenant")
    password_selector = 'input[name="credentials.passcode"]'
    password_input = page.query_selector(password_selector)
    if not password_input:
        logger.info("Password field missing, assuming two-step process")
        page.click(".button-primary")
        page.wait_for_load_state("networkidle")
        page.wait_for_selector(password_selector)
    page.type(password_selector, creds.password)
    page.click(".button-primary")
    page.wait_for_function(f'() => !document.URL.startsWith("{creds.tenant_url}")')
