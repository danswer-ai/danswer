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

SUBJECT_MATCH_PATTERN = r"\*\*Subject\*\*: (.*)"


class EmailService:
    """ Main class to handle plotting operations. """

    # Setup logger
    logger = setup_logger()

    def __init__(self):
        self.logger.info('Initializing SendEmail class')

    def send_email(self, receiver_email, email_content):
        try:
            subject = self.extract_subject(email_content) or "Sent From ComposeEmailTool"

            # Remove the subject line from the email content
            email_content_without_subject = re.sub(SUBJECT_MATCH_PATTERN, "", email_content)

            msg = MIMEMultipart("alternative")
            msg['Subject'] = subject
            msg['To'] = receiver_email

            # Create the HTML body and set the content-type as 'text/html'
            html = markdown.markdown(email_content_without_subject)
            html_part = MIMEText(html, 'html')
            msg.attach(html_part)

            # create secure connection with server
            with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
                server.starttls()
                server.login(SMTP_USER, SMTP_PASS)
                server.sendmail(EMAIL_FROM, receiver_email, msg.as_string())
                self.logger.info(f'Email sent successfully to {receiver_email}')
        except (smtplib.SMTPException, ConnectionRefusedError) as e:
            self.logger.info(f'Error sending email:{e}')

    @staticmethod
    def extract_subject(input_text):
        subject_match = re.search(SUBJECT_MATCH_PATTERN, input_text)

        subject = ""
        if subject_match:
            subject = subject_match.group(1)
        return subject
