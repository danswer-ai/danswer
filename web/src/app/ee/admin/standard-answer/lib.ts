export interface StandaronyxCategoryCreationRequest {
  name: string;
}

export interface StandaronyxCreationRequest {
  keyword: string;
  answer: string;
  categories: number[];
  matchRegex: boolean;
  matchAnyKeywords: boolean;
}

const buildRequestBodyFromStandaronyxCategoryCreationRequest = (
  request: StandaronyxCategoryCreationRequest
) => {
  return JSON.stringify({
    name: request.name,
  });
};

export const createStandaronyxCategory = async (
  request: StandaronyxCategoryCreationRequest
) => {
  return fetch("/api/manage/admin/standard-answer/category", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromStandaronyxCategoryCreationRequest(request),
  });
};

export const updateStandaronyxCategory = async (
  id: number,
  request: StandaronyxCategoryCreationRequest
) => {
  return fetch(`/api/manage/admin/standard-answer/category/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromStandaronyxCategoryCreationRequest(request),
  });
};

const buildRequestBodyFromStandaronyxCreationRequest = (
  request: StandaronyxCreationRequest
) => {
  return JSON.stringify({
    keyword: request.keyword,
    answer: request.answer,
    categories: request.categories,
    match_regex: request.matchRegex,
    match_any_keywords: request.matchAnyKeywords,
  });
};

export const createStandaronyx = async (
  request: StandaronyxCreationRequest
) => {
  return fetch("/api/manage/admin/standard-answer", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromStandaronyxCreationRequest(request),
  });
};

export const updateStandaronyx = async (
  id: number,
  request: StandaronyxCreationRequest
) => {
  return fetch(`/api/manage/admin/standard-answer/${id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: buildRequestBodyFromStandaronyxCreationRequest(request),
  });
};

export const deleteStandaronyx = async (id: number) => {
  return fetch(`/api/manage/admin/standard-answer/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
};
