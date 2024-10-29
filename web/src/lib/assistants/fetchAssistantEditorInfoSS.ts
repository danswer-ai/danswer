import { Assistant } from "@/app/admin/assistants/interfaces";
import { CCPairBasicInfo, DocumentSet, User } from "../types";
import { fetchSS } from "../utilsSS";
import {
  FullLLMProvider,
  getProviderIcon,
} from "@/app/admin/configuration/llm/interfaces";
import { ToolSnapshot } from "../tools/interfaces";
import { fetchToolsSS } from "../tools/fetchTools";
import { getCurrentTeamspaceUserSS, getCurrentUserSS } from "../userSS";

export async function fetchAssistantEditorInfoSS(
  assistantId?: number | string,
  teamspaceId?: string | string[]
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
    fetchToolsSS(),
  ];

  const user = teamspaceId
    ? await getCurrentTeamspaceUserSS(teamspaceId)
    : await getCurrentUserSS();

  // Fetch assistant if assistantId is provided
  if (assistantId) {
    tasks.push(fetchSS(`/assistant/${assistantId}`));
  } else {
    tasks.push((async () => null)());
  }

  // Execute all fetch tasks
  const [
    ccPairsInfoResponse,
    documentSetsResponse,
    llmProvidersResponse,
    toolsResponse,
    assistantResponse,
  ] = (await Promise.all(tasks)) as [
    Response,
    Response,
    Response,
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

  for (const provider of llmProviders) {
    provider.icon = getProviderIcon(provider.provider);
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
