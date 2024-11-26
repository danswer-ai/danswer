import { SearchSection } from "@/components/search/SearchSection";
import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { fetchSS } from "@/lib/utilsSS";
import { CCPairBasicInfo, DocumentSet, Tag, User } from "@/lib/types";
import { cookies } from "next/headers";
import { SearchType } from "@/lib/search/interfaces";
import {
  WelcomeModal,
  hasCompletedWelcomeFlowSS,
} from "@/components/initialSetup/welcome/WelcomeModalWrapper";
import { unstable_noStore as noStore } from "next/cache";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { NoSourcesModal } from "@/components/initialSetup/search/NoSourcesModal";
import { NoCompleteSourcesModal } from "@/components/initialSetup/search/NoCompleteSourceModal";
import { ChatPopup } from "@/app/chat/ChatPopup";
import { SearchSidebar } from "@/app/search/SearchSidebar";
import { BarLayout } from "@/components/BarLayout";
import { HelperFab } from "@/components/HelperFab";
import {
  FetchAssistantsResponse,
  fetchAssistantsSS,
} from "@/lib/assistants/fetchAssistantsSS";
import { fetchLLMProvidersSS } from "@/lib/llm/fetchLLMs";
import { LLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { ChatSession } from "@/app/chat/interfaces";
import {
  AGENTIC_SEARCH_TYPE_COOKIE_NAME,
  DISABLE_LLM_DOC_RELEVANCE,
  NEXT_PUBLIC_DEFAULT_SIDEBAR_OPEN,
} from "@/lib/constants";
import { ApiKeyModal } from "@/components/llm/ApiKeyModal";
import { FullEmbeddingModelResponse } from "@/components/embedding/interfaces";
import { SearchProvider } from "@/context/SearchContext";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { assistantComparator } from "@/app/admin/assistants/lib";

export default async function Home({
  params,
}: {
  params: { teamspaceId: string };
}) {
  // Disable caching so we always get the up to date connector / document set / assistant info
  // importantly, this prevents users from adding a connector, going back to the main page,
  // and then getting hit with a "No Connectors" popup
  noStore();

  const tasks = [
    getAuthTypeMetadataSS(),
    getCurrentUserSS(),
    fetchSS(`/manage/indexing-status?teamspace_id=${params.teamspaceId}`),
    fetchSS(`/manage/document-set?teamspace_id=${params.teamspaceId}`),
    fetchAssistantsSS(params.teamspaceId),
    fetchSS("/query/valid-tags"),
    fetchSS(`/query/user-searches?teamspace_id=${params.teamspaceId}`),
    fetchLLMProvidersSS(),
  ];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (
    | User
    | Response
    | AuthTypeMetadata
    | FullEmbeddingModelResponse
    | FetchAssistantsResponse
    | LLMProviderDescriptor[]
    | null
  )[] = [null, null, null, null, null, null, null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }
  const authTypeMetadata = results[0] as AuthTypeMetadata | null;
  const user = results[1] as User | null;
  const ccPairsResponse = results[2] as Response | null;
  const documentSetsResponse = results[3] as Response | null;
  const [initialAssistantsList, assistantsFetchError] =
    results[4] as FetchAssistantsResponse;
  const tagsResponse = results[5] as Response | null;
  const queryResponse = results[6] as Response | null;
  const llmProviders = (results[7] || []) as LLMProviderDescriptor[];

  const authDisabled = authTypeMetadata?.authType === "disabled";
  if (!authDisabled && !user) {
    return redirect("/auth/login");
  }

  if (user && !user.is_verified && authTypeMetadata?.requiresVerification) {
    return redirect("/auth/waiting-on-verification");
  }

  let ccPairs: CCPairBasicInfo[] = [];
  if (ccPairsResponse?.ok) {
    ccPairs = await ccPairsResponse.json();
  } else {
    console.log(`Failed to fetch connectors - ${ccPairsResponse?.status}`);
  }

  let documentSets: DocumentSet[] = [];
  if (documentSetsResponse?.ok) {
    documentSets = await documentSetsResponse.json();
  } else {
    console.log(
      `Failed to fetch document sets - ${documentSetsResponse?.status}`
    );
  }

  let querySessions: ChatSession[] = [];
  if (queryResponse?.ok) {
    querySessions = (await queryResponse.json()).sessions;
  } else {
    console.log(`Failed to fetch chat sessions - ${queryResponse?.text()}`);
  }

  let assistants: Assistant[] = initialAssistantsList;
  if (assistantsFetchError) {
    console.log(`Failed to fetch assistants - ${assistantsFetchError}`);
  } else {
    // remove those marked as hidden by an admin
    assistants = assistants.filter((assistant) => assistant.is_visible);
    // hide assistants with no retrieval
    assistants = assistants.filter((assistant) => assistant.num_chunks !== 0);
    // sort them in priority order
    assistants.sort(assistantComparator);
  }

  let tags: Tag[] = [];
  if (tagsResponse?.ok) {
    tags = (await tagsResponse.json()).tags;
  } else {
    console.log(`Failed to fetch tags - ${tagsResponse?.status}`);
  }

  // needs to be done in a non-client side component due to nextjs
  const storedSearchType = cookies().get("searchType")?.value as
    | string
    | undefined;
  let searchTypeDefault: SearchType =
    storedSearchType !== undefined &&
    SearchType.hasOwnProperty(storedSearchType)
      ? (storedSearchType as SearchType)
      : SearchType.SEMANTIC; // default to semantic

  const hasAnyConnectors = ccPairs.length > 0;

  const shouldShowWelcomeModal =
    !llmProviders.length &&
    !hasCompletedWelcomeFlowSS() &&
    !hasAnyConnectors &&
    (!user || user.role === "admin");

  const shouldDisplayNoSourcesModal =
    (!user || user.role === "admin") &&
    ccPairs.length === 0 &&
    !shouldShowWelcomeModal;

  const shouldDisplaySourcesIncompleteModal =
    !ccPairs.some(
      (ccPair) => ccPair.has_successful_run && ccPair.docs_indexed > 0
    ) &&
    !shouldDisplayNoSourcesModal &&
    !shouldShowWelcomeModal &&
    (!user || user.role == "admin");

  const agenticSearchToggle = cookies().get(AGENTIC_SEARCH_TYPE_COOKIE_NAME);

  const agenticSearchEnabled = agenticSearchToggle
    ? agenticSearchToggle.value.toLocaleLowerCase() == "true" || false
    : false;

  return (
    <div className="h-full overflow-y-auto">
      <HealthCheckBanner />
      <div className="relative flex h-full">
        <SearchProvider
          value={{
            querySessions,
            ccPairs,
            documentSets,
            assistants,
            tags,
            agenticSearchEnabled,
            disabledAgentic: DISABLE_LLM_DOC_RELEVANCE,
            shouldShowWelcomeModal,
            shouldDisplayNoSources: shouldDisplayNoSourcesModal,
          }}
        >
          <BarLayout
            user={user}
            teamspaceId={params.teamspaceId}
            BarComponent={SearchSidebar}
          />
          {shouldShowWelcomeModal && <WelcomeModal user={user} />}
          {shouldDisplayNoSourcesModal && <NoSourcesModal />}
          {shouldDisplaySourcesIncompleteModal && (
            <NoCompleteSourcesModal ccPairs={ccPairs} />
          )}
          {/* ChatPopup is a custom popup that displays a admin-specified message on initial user visit. 
      Only used in the EE version of the app. */}
          <ChatPopup />
          <InstantSSRAutoRefresh />
          <div className="w-full h-full overflow-hidden overflow-y-auto min-h-screen">
            <div className="pt-20 lg:pt-14 lg:px-14 container">
              <SearchSection
                defaultSearchType={searchTypeDefault}
                teamspaceId={params.teamspaceId}
              />
            </div>
          </div>
        </SearchProvider>
      </div>
      {/* <HelperFab /> */}
    </div>
  );
}
