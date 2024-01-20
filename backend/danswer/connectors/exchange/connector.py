import io
import tempfile
import os
from datetime import datetime
from datetime import timezone
from typing import Any

from O365 import Account

from danswer.configs.app_configs import INDEX_BATCH_SIZE
from danswer.configs.constants import DocumentSource
from danswer.connectors.interfaces import GenerateDocumentsOutput
from danswer.connectors.interfaces import LoadConnector
from danswer.connectors.interfaces import PollConnector
from danswer.connectors.interfaces import SecondsSinceUnixEpoch
from danswer.connectors.models import ConnectorMissingCredentialError
from danswer.connectors.models import Document
from danswer.connectors.models import BasicExpertInfo
from danswer.connectors.models import Section
from danswer.utils.logger import setup_logger
from danswer.connectors.cross_connector_utils.file_utils import read_pdf_file

logger = setup_logger()

class ExchangeConnector(LoadConnector, PollConnector):
    def __init__(
        self,
        batch_size: int = INDEX_BATCH_SIZE,
        categories: list[str] = [],
    ) -> None:
        self.batch_size = batch_size
        self.account: Account | None = None
        self.index_categories: list[str] = categories

    def load_credentials(self, credentials: dict[str, Any]) -> dict[str, Any] | None:
        aad_client_id = credentials["aad_client_id"]
        aad_client_secret = credentials["aad_client_secret"]
        aad_tenant_id = credentials["aad_tenant_id"]
        aad_user_id = credentials["aad_user_id"]

        credentials = (aad_client_id, aad_client_secret)
        account = Account(credentials,auth_flow_type='credentials', tenant_id=aad_tenant_id, main_resource=aad_user_id)
        if not account.is_authenticated:
            account.authenticate()
        
        self.account = account
        return None
    
    def _prune_email_list_by_time(self, email_list: list, start: datetime, end: datetime) -> list:
        return [email for email in email_list if email.created_date_time >= start and email.created_date_time <= end]

    def get_all_email_objects(self, index_categories: list) -> list:
        mailbox = self.account.mailbox()
        inbox = mailbox.inbox_folder()

        if len(index_categories) == 0:
            emails = mailbox.get_messages(limit=100)
            return emails
        else:
            emails = []
            # Process for each category
            for category in index_categories:
                logger.info(f"CATEGORY: {category}")
                query = mailbox.new_query().search(f"category:{category}")
                emails_cat = mailbox.get_messages(query=query, limit=100)
                emails.extend(emails_cat)

        return emails

    def _fetch_from_exchange(
            self, start: datetime | None = None, end: datetime | None = None
    ) -> GenerateDocumentsOutput:
        if self.account is None:
            raise ConnectorMissingCredentialError("Exchange")
        
        email_object_list = self.get_all_email_objects( self.index_categories)
        
        if start is not None and end is not None:
            filtered_email_object_list = []
            for email in email_object_list:
                
                logger.info(f"Email received: {email.modified}")
                email_received_date = datetime.utcfromtimestamp(email.modified.timestamp())

                # Check if email_received_date is within the start and end range
                if start <= email_received_date <= end:
                    filtered_email_object_list.append(email)
                    logger.info("Email added to filtered list.")
                else:
                    logger.info("Email not within the date range.")

            email_object_list = filtered_email_object_list

            
        doc_batch: list[Document] = []
        batch_count = 0
        for email in email_object_list:
            doc_batch.append(self.convert_email_to_document(email))

            batch_count += 1
            if batch_count >= self.batch_size:
                yield doc_batch
                batch_count = 0
                doc_batch = list[Document] = []
        yield doc_batch
        
    def convert_email_to_document(self, email) -> Document:
        # Get the email 
        subject = email.subject

        str_to_address = ""
        str_cc_address = ""
        str_bcc_address = ""
        if email.to:
            for to_address in email.to:
                str_to_address = str_to_address + to_address.address + ", "
        if email.cc:
            for cc_address in email.cc:
                str_cc_address = str_cc_address + cc_address.address + ", "
        if email.bcc:
            for bcc_address in email.bcc:
                str_bcc_address = str_bcc_address + bcc_address.address + ", "

        body = email.body
        sender = email.sender.address
        date = email.received.strftime('%Y-%m-%d %H:%M:%S')
        attachments = email.attachments
        categories = email.categories
        importance = email.importance

        # Create a unique name for this email
        symantic_identifier = f"{sender} {subject} {date}"
        #create text from the email details
        email_text = f"Subject: {subject}"
        email_text += f"\n\nSender: {sender}"
        email_text += f"\n\nTo: {str_to_address}"
        email_text += f"\n\nCC: {str_cc_address}"
        email_text += f"\n\nBCC: {str_bcc_address}"
        email_text += f"\n\nDate: {date}"
        email_text += f"\n\nCategories: {categories}"
        email_text += f"\n\nImportance: {importance}"
        email_text += f"\n\nBody: {body}"
        link = f"https://outlook.office.com/owa/?ItemID={email.object_id}&viewmodel=ReadMessageItem&path=&exvsurl=1"

        # Create a document object
        document = Document(
            id=email.object_id,
            sections=[Section(link=link, text=email_text)],
            source=DocumentSource.EXCHANGE,
            semantic_identifier=symantic_identifier,
            doc_update_at=email.received.replace(tzinfo=timezone.utc),
            primary_owners=[BasicExpertInfo(email=sender)],
            metadata={}
        )

        # ZT Will handle attachments later
        # # Add the attachments to the document
        # for attachment in attachments:
        #     # Get the attachment name
        #     attachment_name = attachment.name
        #     # Get the attachment content
        #     attachment_content = attachment.read()
        #     # Get the attachment file extension
        #     attachment_extension = attachment.content_type.split('/')[-1]

        #     # Create a section object
        #     section = Section(
        #         title=attachment_name,
        #         content=attachment_content,
        #         source_type=DocumentSource.EXCHANGE,
        #         source_links=[],
        #         semantic_identifier=email.id,
        #         metadata={
        #             "sender": sender,
        #             "recipients": recipients,
        #             "date": date,
        #             "categories": categories
        #         }
        #     )

        #     # Add the section to the document
        #     document.sections.append(section)

        return document
    
    def load_from_state(self) -> GenerateDocumentsOutput:
        return self._fetch_from_exchange()
    
    def poll_source(self, start: SecondsSinceUnixEpoch, end: SecondsSinceUnixEpoch) -> GenerateDocumentsOutput:
        start_datetime = datetime.utcfromtimestamp(start)
        end_datetime = datetime.utcfromtimestamp(end)
        return self._fetch_from_exchange(start_datetime, end_datetime)


if __name__ == "__main__":
    import os

    connector = ExchangeConnector(
        index_categories=os.environ["categories"]
    )

    connector.load_credentials(
        {
            "aad_client_id": os.environ["AAD_CLIENT_ID"],
            "aad_client_secret": os.environ["AAD_CLIENT_SECRET"],
            "aad_tenant_id": os.environ["AAD_TENANT_ID"],
            "aad_user_id": os.environ["AAD_USER_ID"],
        }
    )
    document_batches = connector.load_from_state()
    logger.info(next(document_batches))