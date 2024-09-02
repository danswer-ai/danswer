import { SearchSection } from "@/components/search/SearchSection";
import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ApiKeyModal } from "@/components/llm/ApiKeyModal";
import { fetchSS } from "@/lib/utilsSS";
import { CCPairBasicInfo, DocumentSet, Tag, User } from "@/lib/types";
import { cookies } from "next/headers";
import { SearchType } from "@/lib/search/interfaces";
import { Assistant } from "../admin/assistants/interfaces";
import {
  WelcomeModal,
  hasCompletedWelcomeFlowSS,
} from "@/components/initialSetup/welcome/WelcomeModalWrapper";
import { unstable_noStore as noStore } from "next/cache";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { assistantComparator } from "../admin/assistants/lib";
import { FullEmbeddingModelResponse } from "../admin/models/embedding/embeddingModels";
import { NoSourcesModal } from "@/components/initialSetup/search/NoSourcesModal";
import { NoCompleteSourcesModal } from "@/components/initialSetup/search/NoCompleteSourceModal";
import { ChatPopup } from "../chat/ChatPopup";
import { SearchBars } from "./SearchBars";

export default async function Home() {
  // Disable caching so we always get the up to date connector / document set / assistant info
  // importantly, this prevents users from adding a connector, going back to the main page,
  // and then getting hit with a "No Connectors" popup
  noStore();

  const tasks = [
    getAuthTypeMetadataSS(),
    getCurrentUserSS(),
    fetchSS("/manage/indexing-status"),
    fetchSS("/manage/document-set"),
    fetchSS("/assistant"),
    fetchSS("/query/valid-tags"),
    fetchSS("/secondary-index/get-embedding-models"),
  ];

  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let results: (
    | User
    | Response
    | AuthTypeMetadata
    | FullEmbeddingModelResponse
    | null
  )[] = [null, null, null, null, null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }
  const authTypeMetadata = results[0] as AuthTypeMetadata | null;
  const user = results[1] as User | null;
  const ccPairsResponse = results[2] as Response | null;
  const documentSetsResponse = results[3] as Response | null;
  const assistantResponse = results[4] as Response | null;
  const tagsResponse = results[5] as Response | null;
  const embeddingModelResponse = results[6] as Response | null;

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

  let assistants: Assistant[] = [];

  if (assistantResponse?.ok) {
    assistants = await assistantResponse.json();
  } else {
    console.log(`Failed to fetch assistants - ${assistantResponse?.status}`);
  }
  // remove those marked as hidden by an admin
  assistants = assistants.filter((assistant) => assistant.is_visible);
  // hide assistants with no retrieval
  assistants = assistants.filter((assistant) => assistant.num_chunks !== 0);
  // sort them in priority order
  assistants.sort(assistantComparator);

  let tags: Tag[] = [];
  if (tagsResponse?.ok) {
    tags = (await tagsResponse.json()).tags;
  } else {
    console.log(`Failed to fetch tags - ${tagsResponse?.status}`);
  }

  const embeddingModelVersionInfo =
    embeddingModelResponse && embeddingModelResponse.ok
      ? ((await embeddingModelResponse.json()) as FullEmbeddingModelResponse)
      : null;
  const currentEmbeddingModelName =
    embeddingModelVersionInfo?.current_model_name;
  const nextEmbeddingModelName =
    embeddingModelVersionInfo?.secondary_model_name;

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
    !shouldShowWelcomeModal;

  return (
    <div className="relative flex h-full">
      <SearchBars user={user} />

      <HealthCheckBanner />

      {shouldShowWelcomeModal && <WelcomeModal user={user} />}

      {!shouldShowWelcomeModal &&
        !shouldDisplayNoSourcesModal &&
        !shouldDisplaySourcesIncompleteModal && <ApiKeyModal user={user} />}

      {shouldDisplayNoSourcesModal && <NoSourcesModal />}

      {shouldDisplaySourcesIncompleteModal && (
        <NoCompleteSourcesModal ccPairs={ccPairs} />
      )}

      {/* ChatPopup is a custom popup that displays a admin-specified message on initial user visit. 
      Only used in the EE version of the app. */}
      <ChatPopup />

      <InstantSSRAutoRefresh />

      <div className="container pt-20 lg:pt-14 px-6 lg:pl-24 lg:pr-14 xl:px-10 2xl:px-24 h-screen overflow-hidden">
        <SearchSection
          ccPairs={ccPairs}
          documentSets={documentSets}
          assistants={assistants}
          tags={tags}
          defaultSearchType={searchTypeDefault}
        />
      </div>
    </div>
  );
}
