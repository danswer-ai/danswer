from uuid import uuid4

from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.cc_pair import CCPairManager
from tests.integration.common_utils.constants import NUM_DOCS
from tests.integration.common_utils.document_set import DocumentSetManager
from tests.integration.common_utils.seed_documents import DocumentManager
from tests.integration.common_utils.user import TestUser
from tests.integration.common_utils.user import UserManager
from tests.integration.common_utils.user_group import TestUserGroup
from tests.integration.common_utils.user_group import UserGroupManager
from tests.integration.common_utils.vespa import TestVespaClient


def test_connector_deletion(reset: None, vespa_client: TestVespaClient) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")
    # add api key to user
    admin_user = DocumentManager.add_api_key_to_user(
        user=admin_user,
    )

    # create connectors
    cc_pair_1 = CCPairManager.create_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )
    cc_pair_2 = CCPairManager.create_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )

    # seed documents
    cc_pair_1 = DocumentManager.seed_and_attach_docs(
        cc_pair=cc_pair_1,
        num_docs=NUM_DOCS,
        user_with_api_key=admin_user,
    )
    cc_pair_2 = DocumentManager.seed_and_attach_docs(
        cc_pair=cc_pair_2,
        num_docs=NUM_DOCS,
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
    DocumentSetManager.wait_for_sync(user_performing_action=admin_user)

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
    UserGroupManager.wait_for_sync(user_performing_action=admin_user)

    # delete connector 1
    CCPairManager.pause_cc_pair(
        cc_pair=cc_pair_1,
        user_performing_action=admin_user,
    )
    CCPairManager.delete(
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

    CCPairManager.wait_for_deletion_completion(user_performing_action=admin_user)

    # validate vespa documents
    assert DocumentManager.verify(
        vespa_client=vespa_client,
        cc_pair=cc_pair_1,
        doc_set_names=[],
        group_names=[],
        doc_creating_user=admin_user,
        verify_deleted=True,
    )

    assert DocumentManager.verify(
        vespa_client=vespa_client,
        cc_pair=cc_pair_2,
        doc_set_names=[doc_set_2.name],
        group_names=[user_group_2.name],
        doc_creating_user=admin_user,
        verify_deleted=False,
    )

    # check that only connector 1 is deleted
    assert CCPairManager.verify(
        cc_pair=cc_pair_2,
        user_performing_action=admin_user,
    )

    # validate document sets
    all_doc_sets = DocumentSetManager.get_all(
        user_performing_action=admin_user,
    )
    assert len(all_doc_sets) == 2

    assert DocumentSetManager.verify(
        document_set=doc_set_1,
        user_performing_action=admin_user,
    )
    assert DocumentSetManager.verify(
        document_set=doc_set_2,
        user_performing_action=admin_user,
    )

    # validate user groups
    all_user_groups = UserGroupManager.get_all(
        user_performing_action=admin_user,
    )
    assert len(all_user_groups) == 2

    assert UserGroupManager.verify(
        user_group=user_group_1,
        user_performing_action=admin_user,
    )
    assert UserGroupManager.verify(
        user_group=user_group_2,
        user_performing_action=admin_user,
    )


def test_connector_deletion_for_overlapping_connectors(
    reset: None, vespa_client: TestVespaClient
) -> None:
    """Checks to make sure that connectors with overlapping documents work properly. Specifically, that the overlapping
    document (1) still exists and (2) has the right document set / group post-deletion of one of the connectors.
    """
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")
    # add api key to user
    admin_user = DocumentManager.add_api_key_to_user(
        user=admin_user,
    )

    # create connectors
    cc_pair_1 = CCPairManager.create_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )
    cc_pair_2 = CCPairManager.create_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )

    doc_ids = [str(uuid4())]
    cc_pair_1 = DocumentManager.seed_and_attach_docs(
        cc_pair=cc_pair_1,
        document_ids=doc_ids,
        user_with_api_key=admin_user,
    )
    cc_pair_2 = DocumentManager.seed_and_attach_docs(
        cc_pair=cc_pair_2,
        document_ids=doc_ids,
        user_with_api_key=admin_user,
    )

    # create document set
    doc_set_1 = DocumentSetManager.create(
        name="Test Document Set",
        cc_pair_ids=[cc_pair_1.id],
        user_performing_action=admin_user,
    )
    DocumentSetManager.wait_for_sync(
        document_sets_to_check=[doc_set_1],
        user_performing_action=admin_user,
    )

    print("Document sets created and synced")

    # create a user group and attach it to connector 1
    user_group_1: TestUserGroup = UserGroupManager.create(
        name="Test User Group",
        cc_pair_ids=[cc_pair_1.id],
        user_performing_action=admin_user,
    )
    UserGroupManager.wait_for_sync(
        user_groups_to_check=[user_group_1],
        user_performing_action=admin_user,
    )

    print("User group created and synced")

    # delete connector 1
    CCPairManager.pause_cc_pair(
        cc_pair=cc_pair_1,
        user_performing_action=admin_user,
    )
    CCPairManager.delete(
        cc_pair=cc_pair_1,
        user_performing_action=admin_user,
    )

    # wait for deletion to finish
    CCPairManager.wait_for_deletion_completion(user_performing_action=admin_user)

    print("Connector 1 deleted")

    # check that only connector 2 is deleted
    # TODO: check for the CC pair rather than the connector once the refactor is done
    assert not CCPairManager.verify(
        cc_pair=cc_pair_1,
        user_performing_action=admin_user,
    )
    assert CCPairManager.verify(
        cc_pair=cc_pair_2,
        user_performing_action=admin_user,
    )

    # validate vespa documents
    assert DocumentManager.verify(
        vespa_client=vespa_client,
        cc_pair=cc_pair_2,
        doc_set_names=[doc_set_1.name],
        group_names=[user_group_1.name],
        doc_creating_user=admin_user,
        verify_deleted=False,
    )
