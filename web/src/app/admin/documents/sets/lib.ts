import { CCPairID } from "@/lib/types";

interface DocumentSetCreationRequest {
  name: string;
  description: string;
  ccPairs: CCPairID[];
}

export const createDocumentSet = async ({
  name,
  description,
  ccPairs,
}: DocumentSetCreationRequest) => {
  return fetch("/api/manage/admin/document-set", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
      cc_pairs: ccPairs,
    }),
  });
};

interface DocumentSetUpdateRequest {
  id: number;
  description: string;
  ccPairs: CCPairID[];
}

export const updateDocumentSet = async ({
  id,
  description,
  ccPairs,
}: DocumentSetUpdateRequest) => {
  return fetch("/api/manage/admin/document-set", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      description,
      cc_pairs: ccPairs,
    }),
  });
};

export const deleteDocumentSet = async (id: number) => {
  return fetch(`/api/manage/admin/document-set/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
};
