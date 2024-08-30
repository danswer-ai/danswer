from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.cc_pair import CCPairManager
from tests.integration.common_utils.connector import ConnectorManager
from tests.integration.common_utils.credential import CredentialManager
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
    connector_1 = ConnectorManager.create(
        name="tc1",
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )
    connector_2 = ConnectorManager.create(
        name="tc2",
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )
    credential_1 = CredentialManager.create(
        name="tc1",
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )
    credential_2 = CredentialManager.create(
        name="tc2",
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )
    cc_pair_1 = CCPairManager.create(
        connector_id=connector_1.id,
        credential_id=credential_1.id,
        user_performing_action=admin_user,
    )
    cc_pair_2 = CCPairManager.create(
        connector_id=connector_2.id,
        credential_id=credential_2.id,
        user_performing_action=admin_user,
    )
    api_key = TestDocumentManager.get_api_key(
        user_performing_action=admin_user,
    )
    c1_seed_res = TestDocumentManager.seed_documents(
        num_docs=5,
        cc_pair_id=cc_pair_1.id,
        user_performing_action=admin_user,
        api_key=api_key,
    )
    c2_seed_res = TestDocumentManager.seed_documents(
        num_docs=5,
        cc_pair_id=cc_pair_2.id,
        user_performing_action=admin_user,
        api_key=api_key,
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

    # if so, create ACLs
    user_group_1: TestUserGroup = UserGroupManager.create(
        name="Test User Group 1",
        user_ids=[],
        cc_pair_ids=[cc_pair_1.id],
        user_performing_action=admin_user,
    )

    user_group_2: TestUserGroup = UserGroupManager.create(
        name="Test User Group 2",
        user_ids=[],
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
    user_group_1.cc_pair_ids = []
    user_group_2.cc_pair_ids = [cc_pair_2.id]
    doc_set_1.cc_pair_ids = []
    doc_set_2.cc_pair_ids = [cc_pair_2.id]

    CCPairManager.wait_for_cc_pairs_deletion_complete(user_performing_action=admin_user)

    # validate vespa documents
    c1_vespa_docs = vespa_client.get_documents_by_id(
        [doc.id for doc in c1_seed_res.documents]
    )["documents"]
    c2_vespa_docs = vespa_client.get_documents_by_id(
        [doc.id for doc in c2_seed_res.documents]
    )["documents"]

    assert len(c1_vespa_docs) == 0
    assert len(c2_vespa_docs) == 5

    # TODO: fix this
    # import json
    # for doc in c2_vespa_docs:
    # print(json.dumps(doc, indent=2))
    # assert doc["fields"]["access_control_list"] == {
    #     "PUBLIC": 1,
    #     "group:Test User Group 2": 1,
    # }
    # assert doc["fields"]["document_sets"] == {"Test Document Set 2": 1}

    # check that only connector 1 is deleted
    # TODO: check for the CC pair rather than the connector once the refactor is done
    all_cc_pairs = CCPairManager.get_all_cc_pairs(
        user_performing_action=admin_user,
    )
    assert len(all_cc_pairs) == 1
    assert all_cc_pairs[0].cc_pair_id == cc_pair_2.id

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

    user_group_1_found = False
    user_group_2_found = False
    for user_group in all_user_groups:
        if user_group.id == user_group_1.id:
            user_group_1_found = True
            assert len(user_group.cc_pairs) == 0
        if user_group.id == user_group_2.id:
            user_group_2_found = True
            assert len(user_group.cc_pairs) == 1
            assert user_group.cc_pairs[0].id == cc_pair_2.id

    assert user_group_1_found
    assert user_group_2_found
