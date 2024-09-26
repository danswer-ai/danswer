"""
This tests the deletion of a user group with the following foreign key constraints:
- connector_credential_pair
- user
- credential
- llm_provider
- document_set
- token_rate_limit (Not Implemented)
- persona
"""
from danswer.server.documents.models import DocumentSource
from tests.integration.common_utils.managers.cc_pair import CCPairManager
from tests.integration.common_utils.managers.credential import CredentialManager
from tests.integration.common_utils.managers.document_set import DocumentSetManager
from tests.integration.common_utils.managers.llm_provider import LLMProviderManager
from tests.integration.common_utils.managers.persona import PersonaManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.managers.user_group import UserGroupManager
from tests.integration.common_utils.test_models import TestCredential
from tests.integration.common_utils.test_models import TestDocumentSet
from tests.integration.common_utils.test_models import TestLLMProvider
from tests.integration.common_utils.test_models import TestPersona
from tests.integration.common_utils.test_models import TestUser
from tests.integration.common_utils.test_models import TestUserGroup


def test_user_group_deletion(reset: None) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: TestUser = UserManager.create(name="admin_user")

    # create connectors
    cc_pair = CCPairManager.create_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )

    # Create user group with a cc_pair and a user
    user_group: TestUserGroup = UserGroupManager.create(
        user_ids=[admin_user.id],
        cc_pair_ids=[cc_pair.id],
        user_performing_action=admin_user,
    )
    cc_pair.groups = [user_group.id]

    UserGroupManager.wait_for_sync(
        user_groups_to_check=[user_group], user_performing_action=admin_user
    )
    UserGroupManager.verify(
        user_group=user_group,
        user_performing_action=admin_user,
    )
    CCPairManager.verify(
        cc_pair=cc_pair,
        user_performing_action=admin_user,
    )

    credential: TestCredential = CredentialManager.create(
        groups=[user_group.id],
        user_performing_action=admin_user,
    )
    document_set: TestDocumentSet = DocumentSetManager.create(
        cc_pair_ids=[cc_pair.id],
        groups=[user_group.id],
        user_performing_action=admin_user,
    )
    llm_provider: TestLLMProvider = LLMProviderManager.create(
        groups=[user_group.id],
        user_performing_action=admin_user,
    )
    persona: TestPersona = PersonaManager.create(
        groups=[user_group.id],
        user_performing_action=admin_user,
    )

    UserGroupManager.wait_for_sync(
        user_groups_to_check=[user_group], user_performing_action=admin_user
    )
    UserGroupManager.verify(
        user_group=user_group,
        user_performing_action=admin_user,
    )

    UserGroupManager.delete(
        user_group=user_group,
        user_performing_action=admin_user,
    )

    UserGroupManager.wait_for_deletion_completion(
        user_groups_to_check=[user_group], user_performing_action=admin_user
    )

    credential.groups = []
    document_set.groups = []
    llm_provider.groups = []
    persona.groups = []
    CredentialManager.verify(
        credential=credential,
        user_performing_action=admin_user,
    )

    DocumentSetManager.verify(
        document_set=document_set,
        user_performing_action=admin_user,
    )

    LLMProviderManager.verify(
        llm_provider=llm_provider,
        user_performing_action=admin_user,
    )

    PersonaManager.verify(
        persona=persona,
        user_performing_action=admin_user,
    )
