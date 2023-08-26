export async function adminDeleteCredential<T>(credentialId: number) {
  return await fetch(`/api/manage/admin/credential/${credentialId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function deleteCredential<T>(credentialId: number) {
  return await fetch(`/api/manage/credential/${credentialId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
}

export async function linkCredential(
  connectorId: number,
  credentialId: number
) {
  const response = await fetch(
    `/api/manage/connector/${connectorId}/credential/${credentialId}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );
  return response.json();
}
