interface PersonaCreationRequest {
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  apply_llm_relevance_filter: boolean | null;
}

export function createPersona(personaCreationRequest: PersonaCreationRequest) {
  return fetch("/api/admin/persona", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(personaCreationRequest),
  });
}

interface PersonaUpdateRequest {
  id: number;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  apply_llm_relevance_filter: boolean | null;
}

export function updatePersona(personaUpdateRequest: PersonaUpdateRequest) {
  const { id, ...requestBody } = personaUpdateRequest;

  return fetch(`/api/admin/persona/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
}

export function deletePersona(personaId: number) {
  return fetch(`/api/admin/persona/${personaId}`, {
    method: "DELETE",
  });
}

export function buildFinalPrompt(systemPrompt: string, taskPrompt: string) {
  let queryString = Object.entries({
    system_prompt: systemPrompt,
    task_prompt: taskPrompt,
  })
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(value)}`
    )
    .join("&");

  return fetch(`/api/persona-utils/prompt-explorer?${queryString}`);
}
