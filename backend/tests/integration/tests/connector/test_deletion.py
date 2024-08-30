from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.cc_pair import CCPairManager
from tests.integration.common_utils.constants import NUM_DOCS
from tests.integration.common_utils.document_set import DocumentSetManager
from tests.integration.common_utils.seed_documents import TestDocumentManager
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager
from tests.integration.common_utils.user_groups import TestUserGroup
from tests.integration.common_utils.user_groups import UserGroupManager
from tests.integration.common_utils.vespa import TestVespaClient


def test_connector_deletion(reset: None, vespa_client: TestVespaClient) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")

    # create connectors
    cc_pair_1 = CCPairManager.create_pair_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )
    cc_pair_2 = CCPairManager.create_pair_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )

    # add api key to user
    admin_user = TestDocumentManager.add_api_key_to_user(
        user=admin_user,
    )

    # seed documents
    cc_1_seeded_docs = TestDocumentManager.seed_documents(
        num_docs=NUM_DOCS,
        cc_pair_id=cc_pair_1.id,
        user_with_api_key=admin_user,
    )
    cc_2_seeded_docs = TestDocumentManager.seed_documents(
        num_docs=NUM_DOCS,
        cc_pair_id=cc_pair_2.id,
        user_with_api_key=admin_user,
    )

    # create document sets
    doc_set_1 = DocumentSetManager.create(
        name="Test Document Set 1",
        cc_pair_ids=[cc_pair_1.id],
        user_performing_action=admin_user,
    )
    doc_set_2 = DocumentSetManager.create(
        name="Test Document Set 2",
        cc_pair_ids=[cc_pair_1.id, cc_pair_2.id],
        user_performing_action=admin_user,
    )

    # wait for document sets to be synced
    DocumentSetManager.wait_for_document_set_sync(user_performing_action=admin_user)

    print("Document sets created and synced")

    # create user groups
    user_group_1: TestUserGroup = UserGroupManager.create(
        cc_pair_ids=[cc_pair_1.id],
        user_performing_action=admin_user,
    )
    user_group_2: TestUserGroup = UserGroupManager.create(
        cc_pair_ids=[cc_pair_1.id, cc_pair_2.id],
        user_performing_action=admin_user,
    )

    # delete connector 1
    CCPairManager.pause_cc_pair(
        cc_pair=cc_pair_1,
        user_performing_action=admin_user,
    )
    CCPairManager.delete_cc_pair(
        cc_pair=cc_pair_1,
        user_performing_action=admin_user,
    )

    # Update local records to match the database for later comparison
    user_group_1.cc_pair_ids = []
    user_group_2.cc_pair_ids = [cc_pair_2.id]
    doc_set_1.cc_pair_ids = []
    doc_set_2.cc_pair_ids = [cc_pair_2.id]
    cc_pair_1.groups = []
    cc_pair_2.groups = [user_group_2.id]

    CCPairManager.wait_for_cc_pairs_deletion_complete(user_performing_action=admin_user)

    # validate vespa documents
    cc_1_vespa_docs = vespa_client.get_documents_by_id(
        [doc.id for doc in cc_1_seeded_docs.documents]
    )["documents"]
    cc_2_vespa_docs = vespa_client.get_documents_by_id(
        [doc.id for doc in cc_2_seeded_docs.documents]
    )["documents"]

    # Deleting the connector should delete the documents from vespa
    assert len(cc_1_vespa_docs) == 0
    assert len(cc_2_vespa_docs) == NUM_DOCS

    # TODO: fix this
    # import json
    # for doc in c2_vespa_docs:
    # print(json.dumps(doc, indent=2))
    # assert doc["fields"]["access_control_list"] == {
    #     "PUBLIC": 1,
    #     "group:Test User Group 2": 1,
    # }
    # assert doc["fields"]["document_sets"] == {f"{doc_set_2.name}": 1}

    # check that only connector 1 is deleted
    assert CCPairManager.verify_cc_pair(
        cc_pair=cc_pair_2,
        user_performing_action=admin_user,
    )

    # validate document sets
    all_doc_sets = DocumentSetManager.get_all_document_sets(
        user_performing_action=admin_user,
    )
    assert len(all_doc_sets) == 2

    assert DocumentSetManager.verify_document_set_sync(
        document_set=doc_set_1,
        user_performing_action=admin_user,
    )
    assert DocumentSetManager.verify_document_set_sync(
        document_set=doc_set_2,
        user_performing_action=admin_user,
    )

    # validate user groups
    all_user_groups = UserGroupManager.fetch_user_groups(
        user_performing_action=admin_user,
    )
    assert len(all_user_groups) == 2

    assert UserGroupManager.verify_user_group(
        user_group=user_group_1,
        user_performing_action=admin_user,
    )
    assert UserGroupManager.verify_user_group(
        user_group=user_group_2,
        user_performing_action=admin_user,
    )
