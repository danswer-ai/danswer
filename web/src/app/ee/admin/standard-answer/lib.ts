export interface StandardAnswerCategoryCreationRequest {
  name: string;
}

export interface StandardAnswerCreationRequest {
  keyword: string;
  answer: string;
  matchRegex: boolean;
  matchAnyKeywords: boolean;
  applyGlobally: boolean;
  personaIds: number[]; // ids
}

const buildRequestBodyFromStandardAnswerCreationRequest = (
  request: StandardAnswerCreationRequest
) => {
  return JSON.stringify({
    keyword: request.keyword,
    answer: request.answer,
    match_regex: request.matchRegex,
    match_any_keywords: request.matchAnyKeywords,
    apply_globally: request.applyGlobally,
    persona_ids: request.personaIds,
  });
};

export const createStandardAnswer = async (
  request: StandardAnswerCreationRequest
) => {
  return fetch("/api/manage/admin/standard-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromStandardAnswerCreationRequest(request),
  });
};

export const updateStandardAnswer = async (
  id: number,
  request: StandardAnswerCreationRequest
) => {
  return fetch(`/api/manage/admin/standard-answer/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromStandardAnswerCreationRequest(request),
  });
};

export const deleteStandardAnswer = async (id: number) => {
  return fetch(`/api/manage/admin/standard-answer/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
};
