import { Assistant, Prompt, StarterMessage } from "./interfaces";
import { FullLLMProvider } from "../configuration/llm/interfaces";

interface AssistantCreationRequest {
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  include_citations: boolean;
  is_public: boolean;
  llm_relevance_filter: boolean | null;
  llm_model_provider_override: string | null;
  llm_model_version_override: string | null;
  starter_messages: StarterMessage[] | null;
  users?: string[];
  groups: number[];
  tool_ids: number[];
  icon_color: string | null;
  icon_shape: number | null;
  remove_image?: boolean;
  uploaded_image: File | null;
  search_start_date: Date | null;
  is_default_assistant: boolean;
}

interface AssistantUpdateRequest {
  id: number;
  existingPromptId: number | undefined;
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  include_citations: boolean;
  is_public: boolean;
  llm_relevance_filter: boolean | null;
  llm_model_provider_override: string | null;
  llm_model_version_override: string | null;
  starter_messages: StarterMessage[] | null;
  users?: string[];
  groups: number[];
  tool_ids: number[];
  icon_color: string | null;
  icon_shape: number | null;
  remove_image: boolean;
  uploaded_image: File | null;
  search_start_date: Date | null;
}

function promptNameFromAssistantName(assistantName: string) {
  return `default-prompt__${assistantName}`;
}

function createPrompt({
  assistantName,
  systemPrompt,
  taskPrompt,
  includeCitations,
}: {
  assistantName: string;
  systemPrompt: string;
  taskPrompt: string;
  includeCitations: boolean;
}) {
  return fetch("/api/prompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: promptNameFromAssistantName(assistantName),
      description: `Default prompt for assistant ${assistantName}`,
      system_prompt: systemPrompt,
      task_prompt: taskPrompt,
      include_citations: includeCitations,
    }),
  });
}

function updatePrompt({
  promptId,
  assistantName,
  systemPrompt,
  taskPrompt,
  includeCitations,
}: {
  promptId: number;
  assistantName: string;
  systemPrompt: string;
  taskPrompt: string;
  includeCitations: boolean;
}) {
  return fetch(`/api/prompt/${promptId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: promptNameFromAssistantName(assistantName),
      description: `Default prompt for assistant ${assistantName}`,
      system_prompt: systemPrompt,
      task_prompt: taskPrompt,
      include_citations: includeCitations,
    }),
  });
}

function buildAssistantAPIBody(
  creationRequest: AssistantCreationRequest | AssistantUpdateRequest,
  promptId: number,
  uploaded_image_id: string | null
) {
  const {
    name,
    description,
    document_set_ids,
    num_chunks,
    llm_relevance_filter,
    is_public,
    groups,
    users,
    tool_ids,
    icon_color,
    icon_shape,
    remove_image,
    search_start_date,
  } = creationRequest;

  const is_default_assistant =
    "is_default_assistant" in creationRequest
      ? creationRequest.is_default_assistant
      : false;

  return {
    name,
    description,
    num_chunks,
    llm_relevance_filter,
    llm_filter_extraction: false,
    is_public,
    recency_bias: "base_decay",
    prompt_ids: [promptId],
    document_set_ids,
    llm_model_provider_override: creationRequest.llm_model_provider_override,
    llm_model_version_override: creationRequest.llm_model_version_override,
    starter_messages: creationRequest.starter_messages,
    users,
    groups,
    tool_ids,
    icon_color,
    icon_shape,
    uploaded_image_id,
    remove_image,
    search_start_date,
    is_default_assistant,
  };
}

export async function uploadFile(file: File): Promise<string | null> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await fetch("/api/admin/assistant/upload-image", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    console.error("Failed to upload file");
    return null;
  }

  const responseJson = await response.json();
  return responseJson.file_id;
}

export async function createAssistant(
  assistantCreationRequest: AssistantCreationRequest
): Promise<[Response, Response | null]> {
  // first create prompt
  const createPromptResponse = await createPrompt({
    assistantName: assistantCreationRequest.name,
    systemPrompt: assistantCreationRequest.system_prompt,
    taskPrompt: assistantCreationRequest.task_prompt,
    includeCitations: assistantCreationRequest.include_citations,
  });
  const promptId = createPromptResponse.ok
    ? (await createPromptResponse.json()).id
    : null;

  let fileId = null;
  if (assistantCreationRequest.uploaded_image) {
    fileId = await uploadFile(assistantCreationRequest.uploaded_image);
    if (!fileId) {
      return [createPromptResponse, null];
    }
  }

  const createAssistantResponse =
    promptId !== null
      ? await fetch("/api/assistant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildAssistantAPIBody(assistantCreationRequest, promptId, fileId)
          ),
        })
      : null;

  return [createPromptResponse, createAssistantResponse];
}

export async function updateAssistant(
  assistantUpdateRequest: AssistantUpdateRequest
): Promise<[Response, Response | null]> {
  const { id, existingPromptId } = assistantUpdateRequest;

  // first update prompt
  let promptResponse;
  let promptId;
  if (existingPromptId !== undefined) {
    promptResponse = await updatePrompt({
      promptId: existingPromptId,
      assistantName: assistantUpdateRequest.name,
      systemPrompt: assistantUpdateRequest.system_prompt,
      taskPrompt: assistantUpdateRequest.task_prompt,
      includeCitations: assistantUpdateRequest.include_citations,
    });
    promptId = existingPromptId;
  } else {
    promptResponse = await createPrompt({
      assistantName: assistantUpdateRequest.name,
      systemPrompt: assistantUpdateRequest.system_prompt,
      taskPrompt: assistantUpdateRequest.task_prompt,
      includeCitations: assistantUpdateRequest.include_citations,
    });
    promptId = promptResponse.ok ? (await promptResponse.json()).id : null;
  }

  let fileId = null;
  if (assistantUpdateRequest.uploaded_image) {
    fileId = await uploadFile(assistantUpdateRequest.uploaded_image);
    if (!fileId) {
      return [promptResponse, null];
    }
  }

  const updateAssistantResponse =
    promptResponse.ok && promptId
      ? await fetch(`/api/assistant/${id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildAssistantAPIBody(assistantUpdateRequest, promptId, fileId)
          ),
        })
      : null;

  return [promptResponse, updateAssistantResponse];
}

export function deleteAssistant(
  assistantId: number,
  teamspaceId?: string | string[] | undefined
) {
  return fetch(
    teamspaceId
      ? `/api/assistant/${assistantId}?teamspace_id=${teamspaceId}`
      : `/api/assistant/${assistantId}`,
    {
      method: "DELETE",
    }
  );
}

export function buildFinalPrompt(
  systemPrompt: string,
  taskPrompt: string,
  retrievalDisabled: boolean
) {
  let queryString = Object.entries({
    system_prompt: systemPrompt,
    task_prompt: taskPrompt,
    retrieval_disabled: retrievalDisabled,
  })
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");

  return fetch(`/api/assistant/utils/prompt-explorer?${queryString}`);
}

function smallerNumberFirstComparator(a: number, b: number) {
  return a > b ? 1 : -1;
}

function closerToZeroNegativesFirstComparator(a: number, b: number) {
  if (a < 0 && b > 0) {
    return -1;
  }
  if (a > 0 && b < 0) {
    return 1;
  }

  const absA = Math.abs(a);
  const absB = Math.abs(b);

  if (absA === absB) {
    return a > b ? 1 : -1;
  }

  return absA > absB ? 1 : -1;
}

export function assistantComparator(a: Assistant, b: Assistant) {
  if (a.display_priority === null && b.display_priority === null) {
    return closerToZeroNegativesFirstComparator(a.id, b.id);
  }

  if (a.display_priority !== b.display_priority) {
    if (a.display_priority === null) {
      return 1;
    }
    if (b.display_priority === null) {
      return -1;
    }

    return smallerNumberFirstComparator(a.display_priority, b.display_priority);
  }

  return closerToZeroNegativesFirstComparator(a.id, b.id);
}

export const toggleAssistantVisibility = async (
  assistantId: number,
  isVisible: boolean
) => {
  const response = await fetch(`/api/admin/assistant/${assistantId}/visible`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      is_visible: !isVisible,
    }),
  });
  return response;
};

export const toggleAssistantPublicStatus = async (
  assistantId: number,
  isPublic: boolean
) => {
  const response = await fetch(`/api/assistant/${assistantId}/public`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      is_public: isPublic,
    }),
  });
  return response;
};

export function checkAssistantRequiresImageGeneration(assistant: Assistant) {
  for (const tool of assistant.tools) {
    if (tool.name === "ImageGenerationTool") {
      return true;
    }
  }
  return false;
}

export function providersContainImageGeneratingSupport(
  providers: FullLLMProvider[]
) {
  return providers.some((provider) => provider.provider === "openai");
}
