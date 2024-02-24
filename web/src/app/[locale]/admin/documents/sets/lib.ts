interface DocumentSetCreationRequest {
  name: string;
  description: string;
  ccPairIds: number[];
}

export const createDocumentSet = async ({
  name,
  description,
  ccPairIds,
}: DocumentSetCreationRequest) => {
  return fetch("/api/manage/admin/document-set", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      description,
      cc_pair_ids: ccPairIds,
    }),
  });
};

interface DocumentSetUpdateRequest {
  id: number;
  description: string;
  ccPairIds: number[];
}

export const updateDocumentSet = async ({
  id,
  description,
  ccPairIds,
}: DocumentSetUpdateRequest) => {
  return fetch("/api/manage/admin/document-set", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      id,
      description,
      cc_pair_ids: ccPairIds,
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
