import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { fetchSS } from "@/lib/utilsSS";
import { Connector, DocumentSet, Tag, User, ValidSources } from "@/lib/types";
import { ChatSession } from "./interfaces";
import { unstable_noStore as noStore } from "next/cache";
import { Persona } from "../admin/personas/interfaces";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { WelcomeModal } from "@/components/WelcomeModal";
import { ApiKeyModal } from "@/components/openai/ApiKeyModal";
import { cookies } from "next/headers";
import { DOCUMENT_SIDEBAR_WIDTH_COOKIE_NAME } from "@/components/resizable/contants";
import { personaComparator } from "../admin/personas/lib";
import { ChatLayout } from "./ChatPage";
import {
  FullEmbeddingModelResponse,
  checkModelNameIsValid,
} from "../admin/models/embedding/embeddingModels";
import { SwitchModelModal } from "@/components/SwitchModelModal";

export default async function Page({
  searchParams,
}: {
  searchParams: { [key: string]: string };
}) {
  noStore();

  const tasks = [
    getAuthTypeMetadataSS(),
    getCurrentUserSS(),
    fetchSS("/manage/connector"),
    fetchSS("/manage/document-set"),
    fetchSS("/persona?include_default=true"),
    fetchSS("/chat/get-user-chat-sessions"),
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
  )[] = [null, null, null, null, null, null, null, null, null];
  try {
    results = await Promise.all(tasks);
  } catch (e) {
    console.log(`Some fetch failed for the main search page - ${e}`);
  }
  const authTypeMetadata = results[0] as AuthTypeMetadata | null;
  const user = results[1] as User | null;
  const connectorsResponse = results[2] as Response | null;
  const documentSetsResponse = results[3] as Response | null;
  const personasResponse = results[4] as Response | null;
  const chatSessionsResponse = results[5] as Response | null;
  const tagsResponse = results[6] as Response | null;
  const embeddingModelResponse = results[7] as Response | null;

  const authDisabled = authTypeMetadata?.authType === "disabled";
  if (!authDisabled && !user) {
    return redirect("/auth/login");
  }

  if (user && !user.is_verified && authTypeMetadata?.requiresVerification) {
    return redirect("/auth/waiting-on-verification");
  }

  let connectors: Connector<any>[] = [];
  if (connectorsResponse?.ok) {
    connectors = await connectorsResponse.json();
  } else {
    console.log(`Failed to fetch connectors - ${connectorsResponse?.status}`);
  }
  const availableSources: ValidSources[] = [];
  connectors.forEach((connector) => {
    if (!availableSources.includes(connector.source)) {
      availableSources.push(connector.source);
    }
  });

  let chatSessions: ChatSession[] = [];
  if (chatSessionsResponse?.ok) {
    chatSessions = (await chatSessionsResponse.json()).sessions;
  } else {
    console.log(
      `Failed to fetch chat sessions - ${chatSessionsResponse?.text()}`
    );
  }
  // Larger ID -> created later
  chatSessions.sort((a, b) => (a.id > b.id ? -1 : 1));

  let documentSets: DocumentSet[] = [];
  if (documentSetsResponse?.ok) {
    documentSets = await documentSetsResponse.json();
  } else {
    console.log(
      `Failed to fetch document sets - ${documentSetsResponse?.status}`
    );
  }

  let personas: Persona[] = [];
  if (personasResponse?.ok) {
    personas = await personasResponse.json();
  } else {
    console.log(`Failed to fetch personas - ${personasResponse?.status}`);
  }
  // remove those marked as hidden by an admin
  personas = personas.filter((persona) => persona.is_visible);
  // sort them in priority order
  personas.sort(personaComparator);

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

  const defaultPersonaIdRaw = searchParams["personaId"];
  const defaultPersonaId = defaultPersonaIdRaw
    ? parseInt(defaultPersonaIdRaw)
    : undefined;

  const documentSidebarCookieInitialWidth = cookies().get(
    DOCUMENT_SIDEBAR_WIDTH_COOKIE_NAME
  );
  const finalDocumentSidebarInitialWidth = documentSidebarCookieInitialWidth
    ? parseInt(documentSidebarCookieInitialWidth.value)
    : undefined;

  return (
    <>
      <InstantSSRAutoRefresh />
      <ApiKeyModal />

      {connectors.length === 0 ? (
        <WelcomeModal embeddingModelName={currentEmbeddingModelName} />
      ) : (
        embeddingModelVersionInfo &&
        !checkModelNameIsValid(currentEmbeddingModelName) &&
        !nextEmbeddingModelName && (
          <SwitchModelModal embeddingModelName={currentEmbeddingModelName} />
        )
      )}

      <ChatLayout
        user={user}
        chatSessions={chatSessions}
        availableSources={availableSources}
        availableDocumentSets={documentSets}
        availablePersonas={personas}
        availableTags={tags}
        defaultSelectedPersonaId={defaultPersonaId}
        documentSidebarInitialWidth={finalDocumentSidebarInitialWidth}
      />
    </>
  );
}
