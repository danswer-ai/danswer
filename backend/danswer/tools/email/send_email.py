import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
import re
import markdown
from danswer.utils.logger import setup_logger
from danswer.configs.app_configs import EMAIL_FROM
from danswer.configs.app_configs import SMTP_PASS
from danswer.configs.app_configs import SMTP_PORT
from danswer.configs.app_configs import SMTP_SERVER
from danswer.configs.app_configs import SMTP_USER


class EmailService:
    """ Main class to handle plotting operations. """

    # Setup logger
    logger = setup_logger()

    def __init__(self):
        self.logger.info('Initializing SendEmail class')

    def process_email(self, input_text, email_content):
        extracted_emails = self.extract_emails(input_text)
        if extracted_emails:
            self.send_email(extracted_emails, email_content)

    def send_email(self, extracted_emails, email_content):
        try:
            subject = self.extract_subject(email_content) or "Sent From ComposeEmailTool"

            msg = MIMEMultipart("alternative")
            msg['Subject'] = subject

            # Create the HTML body and set the content-type as 'text/html'
            html = markdown.markdown(email_content)
            html_part = MIMEText(html, 'html')
            msg.attach(html_part)

            for receiver_email in extracted_emails:
                msg['To'] = receiver_email

                # create secure connection with server
                with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                    server.starttls()
                    server.login(SMTP_USER, SMTP_PASS)
                    server.sendmail(EMAIL_FROM, receiver_email, msg.as_string())
                    self.logger.info(f'Email sent successfully to {receiver_email}')
        except (smtplib.SMTPException, ConnectionRefusedError) as e:
            self.logger.info(f'Error sending email:{e}')

    @staticmethod
    def extract_emails(input_text):
        email_regex = r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        emails = re.findall(email_regex, input_text)
        return emails

    @staticmethod
    def extract_subject(input_text):
        subject_match = re.search(r"\*\*Subject\*\*: (.*)", input_text)
        # match = re.search(r"(?i)(?:Subject:|\*\*Subject\*\*):\s+(.*)", text)

        subject = ""
        if subject_match:
            subject = subject_match.group(1)
        return subject
