import { Assistant } from "@/app/admin/assistants/interfaces";
import { CCPairBasicInfo, DocumentSet, User } from "../types";
import { getCurrentUserSS } from "../userSS";
import { fetchSS } from "../utilsSS";
import { FullLLMProvider } from "@/app/admin/models/llm/interfaces";
import { ToolSnapshot } from "../tools/interfaces";
import { fetchToolsSS } from "../tools/fetchTools";

export async function fetchAssistantEditorInfoSS(
  assistantId?: number | string
): Promise<
  | [
      {
        ccPairs: CCPairBasicInfo[];
        documentSets: DocumentSet[];
        llmProviders: FullLLMProvider[];
        user: User | null;
        existingAssistant: Assistant | null;
        tools: ToolSnapshot[];
      },
      null,
    ]
  | [null, string]
> {
  const tasks = [
    fetchSS("/manage/indexing-status"),
    fetchSS("/manage/document-set"),
    fetchSS("/llm/provider"),
    // duplicate fetch, but shouldn't be too big of a deal
    // this page is not a high traffic page
    getCurrentUserSS(),
    fetchToolsSS(),
  ];
  if (assistantId) {
    tasks.push(fetchSS(`/assistant/${assistantId}`));
  } else {
    tasks.push((async () => null)());
  }

  const [
    ccPairsInfoResponse,
    documentSetsResponse,
    llmProvidersResponse,
    user,
    toolsResponse,
    assistantResponse,
  ] = (await Promise.all(tasks)) as [
    Response,
    Response,
    Response,
    User | null,
    ToolSnapshot[] | null,
    Response | null,
  ];

  if (!ccPairsInfoResponse.ok) {
    return [
      null,
      `Failed to fetch connectors - ${await ccPairsInfoResponse.text()}`,
    ];
  }
  const ccPairs = (await ccPairsInfoResponse.json()) as CCPairBasicInfo[];

  if (!documentSetsResponse.ok) {
    return [
      null,
      `Failed to fetch document sets - ${await documentSetsResponse.text()}`,
    ];
  }
  const documentSets = (await documentSetsResponse.json()) as DocumentSet[];

  if (!toolsResponse) {
    return [null, `Failed to fetch tools`];
  }

  if (!llmProvidersResponse.ok) {
    return [
      null,
      `Failed to fetch LLM providers - ${await llmProvidersResponse.text()}`,
    ];
  }
  const llmProviders = (await llmProvidersResponse.json()) as FullLLMProvider[];

  if (assistantId && assistantResponse && !assistantResponse.ok) {
    return [
      null,
      `Failed to fetch Assistant - ${await assistantResponse.text()}`,
    ];
  }
  const existingAssistant = assistantResponse
    ? ((await assistantResponse.json()) as Assistant)
    : null;

  return [
    {
      ccPairs,
      documentSets,
      llmProviders,
      user,
      existingAssistant,
      tools: toolsResponse,
    },
    null,
  ];
}
