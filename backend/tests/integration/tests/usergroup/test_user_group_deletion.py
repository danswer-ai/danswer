"""
This tests the deletion of a user group with the following foreign key constraints:
- connector_credential_pair
- user
- credential
- llm_provider
- document_set
- token_rate_limit (Not Implemented)
- assistant
"""
from enmedd.server.documents.models import DocumentSource
from tests.integration.common_utils.managers.assistant import AssistantManager
from tests.integration.common_utils.managers.cc_pair import CCPairManager
from tests.integration.common_utils.managers.credential import CredentialManager
from tests.integration.common_utils.managers.document_set import DocumentSetManager
from tests.integration.common_utils.managers.llm_provider import LLMProviderManager
from tests.integration.common_utils.managers.teamspace import TeamspaceManager
from tests.integration.common_utils.managers.user import UserManager
from tests.integration.common_utils.test_models import DATestAssistant
from tests.integration.common_utils.test_models import DATestCredential
from tests.integration.common_utils.test_models import DATestDocumentSet
from tests.integration.common_utils.test_models import DATestLLMProvider
from tests.integration.common_utils.test_models import DATestTeamspace
from tests.integration.common_utils.test_models import DATestUser
from tests.integration.common_utils.vespa import vespa_fixture


def test_teamspace_deletion(reset: None, vespa_client: vespa_fixture) -> None:
    # Creating an admin user (first user created is automatically an admin)
    admin_user: DATestUser = UserManager.create(name="admin_user")

    # create connectors
    cc_pair = CCPairManager.create_from_scratch(
        source=DocumentSource.INGESTION_API,
        user_performing_action=admin_user,
    )

    # Create user group with a cc_pair and a user
    teamspace: DATestTeamspace = TeamspaceManager.create(
        user_ids=[admin_user.id],
        cc_pair_ids=[cc_pair.id],
        user_performing_action=admin_user,
    )
    cc_pair.groups = [teamspace.id]

    TeamspaceManager.wait_for_sync(
        teamspaces_to_check=[teamspace], user_performing_action=admin_user
    )
    TeamspaceManager.verify(
        teamspace=teamspace,
        user_performing_action=admin_user,
    )
    CCPairManager.verify(
        cc_pair=cc_pair,
        user_performing_action=admin_user,
    )

    # Create other objects that are related to the user group
    credential: DATestCredential = CredentialManager.create(
        groups=[teamspace.id],
        user_performing_action=admin_user,
    )
    document_set: DATestDocumentSet = DocumentSetManager.create(
        cc_pair_ids=[cc_pair.id],
        groups=[teamspace.id],
        user_performing_action=admin_user,
    )
    llm_provider: DATestLLMProvider = LLMProviderManager.create(
        groups=[teamspace.id],
        user_performing_action=admin_user,
    )
    assistant: DATestAssistant = AssistantManager.create(
        groups=[teamspace.id],
        user_performing_action=admin_user,
    )

    TeamspaceManager.wait_for_sync(
        teamspaces_to_check=[teamspace], user_performing_action=admin_user
    )
    TeamspaceManager.verify(
        teamspace=teamspace,
        user_performing_action=admin_user,
    )

    # Delete the user group
    TeamspaceManager.delete(
        teamspace=teamspace,
        user_performing_action=admin_user,
    )

    TeamspaceManager.wait_for_deletion_completion(
        teamspaces_to_check=[teamspace], user_performing_action=admin_user
    )

    # Set our expected local representations to empty
    credential.groups = []
    document_set.groups = []
    llm_provider.groups = []
    assistant.groups = []

    # Verify that the local representations were updated
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

    AssistantManager.verify(
        assistant=assistant,
        user_performing_action=admin_user,
    )
