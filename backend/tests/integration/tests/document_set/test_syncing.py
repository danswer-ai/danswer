from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.cc_pair import CCPairManager
from tests.integration.common_utils.constants import NUM_DOCS
from tests.integration.common_utils.document_set import DocumentSetManager
from tests.integration.common_utils.seed_documents import TestDocumentManager
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager
from tests.integration.common_utils.vespa import TestVespaClient


def test_multiple_document_sets_syncing_same_connnector(
    reset: None, vespa_client: TestVespaClient
) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")

    # add api key to user
    admin_user = TestDocumentManager.add_api_key_to_user(
        user=admin_user,
    )

    # create connector
    cc_pair_1 = CCPairManager.create_pair_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )

    # seed documents
    cc_1_seeded_docs = TestDocumentManager.seed_documents(
        num_docs=NUM_DOCS,
        cc_pair_id=cc_pair_1.id,
        user_with_api_key=admin_user,
    )

    # Create document sets
    doc_set_1 = DocumentSetManager.create(
        cc_pair_ids=[cc_pair_1.id],
        user_performing_action=admin_user,
    )
    doc_set_2 = DocumentSetManager.create(
        cc_pair_ids=[cc_pair_1.id],
        user_performing_action=admin_user,
    )

    DocumentSetManager.wait_for_document_set_sync(
        user_performing_action=admin_user,
    )

    assert DocumentSetManager.verify_document_set_sync(
        document_set=doc_set_1,
        user_performing_action=admin_user,
    )
    assert DocumentSetManager.verify_document_set_sync(
        document_set=doc_set_2,
        user_performing_action=admin_user,
    )

    # get names so we can compare to what is in vespa
    doc_sets = DocumentSetManager.get_all_document_sets(
        user_performing_action=admin_user,
    )
    doc_set_names = {doc_set.name for doc_set in doc_sets}

    # make sure documents are as expected
    seeded_document_ids = [doc.id for doc in cc_1_seeded_docs.documents]

    result = vespa_client.get_documents_by_id(
        [doc.id for doc in cc_1_seeded_docs.documents]
    )
    documents = result["documents"]
    assert len(documents) == len(cc_1_seeded_docs.documents)
    assert all(doc["fields"]["document_id"] in seeded_document_ids for doc in documents)
    assert all(
        set(doc["fields"]["document_sets"].keys()) == doc_set_names for doc in documents
    )
