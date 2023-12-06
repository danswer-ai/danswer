import { Prompt } from "./interfaces";

interface PersonaCreationRequest {
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  llm_relevance_filter: boolean | null;
}

interface PersonaUpdateRequest {
  id: number;
  existingPromptId: number;
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  llm_relevance_filter: boolean | null;
}

function promptNameFromPersonaName(personaName: string) {
  return `default-prompt__${personaName}`;
}

function createPrompt({
  personaName,
  systemPrompt,
  taskPrompt,
}: {
  personaName: string;
  systemPrompt: string;
  taskPrompt: string;
}) {
  return fetch("/api/prompt", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: promptNameFromPersonaName(personaName),
      description: `Default prompt for persona ${personaName}`,
      shared: true,
      system_prompt: systemPrompt,
      task_prompt: taskPrompt,
    }),
  });
}

function updatePrompt({
  promptId,
  personaName,
  systemPrompt,
  taskPrompt,
}: {
  promptId: number;
  personaName: string;
  systemPrompt: string;
  taskPrompt: string;
}) {
  return fetch(`/api/prompt/${promptId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: promptNameFromPersonaName(personaName),
      description: `Default prompt for persona ${personaName}`,
      shared: true,
      system_prompt: systemPrompt,
      task_prompt: taskPrompt,
    }),
  });
}

function buildPersonaAPIBody(
  creationRequest: PersonaCreationRequest | PersonaUpdateRequest,
  promptId: number
) {
  const {
    name,
    description,
    document_set_ids,
    num_chunks,
    llm_relevance_filter,
  } = creationRequest;

  return {
    name,
    description,
    shared: true,
    num_chunks,
    llm_relevance_filter,
    llm_filter_extraction: false,
    recency_bias: "base_decay",
    prompt_ids: [promptId],
    document_set_ids,
  };
}

export async function createPersona(
  personaCreationRequest: PersonaCreationRequest
): Promise<[Response, Response | null]> {
  // first create prompt
  const createPromptResponse = await createPrompt({
    personaName: personaCreationRequest.name,
    systemPrompt: personaCreationRequest.system_prompt,
    taskPrompt: personaCreationRequest.task_prompt,
  });
  const promptId = createPromptResponse.ok
    ? (await createPromptResponse.json()).id
    : null;

  const createPersonaResponse =
    promptId !== null
      ? await fetch("/api/admin/persona", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(
            buildPersonaAPIBody(personaCreationRequest, promptId)
          ),
        })
      : null;

  return [createPromptResponse, createPersonaResponse];
}

export async function updatePersona(
  personaUpdateRequest: PersonaUpdateRequest
): Promise<[Response, Response | null]> {
  const { id, existingPromptId, ...requestBody } = personaUpdateRequest;

  // first update prompt
  const updatePromptResponse = await updatePrompt({
    promptId: existingPromptId,
    personaName: personaUpdateRequest.name,
    systemPrompt: personaUpdateRequest.system_prompt,
    taskPrompt: personaUpdateRequest.task_prompt,
  });

  const updatePersonaResponse = updatePromptResponse.ok
    ? await fetch(`/api/admin/persona/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(
          buildPersonaAPIBody(personaUpdateRequest, existingPromptId)
        ),
      })
    : null;

  return [updatePromptResponse, updatePersonaResponse];
}

export function deletePersona(personaId: number) {
  return fetch(`/api/admin/persona/${personaId}`, {
    method: "DELETE",
  });
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

  return fetch(`/api/persona/utils/prompt-explorer?${queryString}`);
}
