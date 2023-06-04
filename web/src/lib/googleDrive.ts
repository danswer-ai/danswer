import { Credential } from "@/lib/types";

interface SetupGoogleDriveArgs {
  isPublic: boolean;
}

export const setupGoogleDriveOAuth = async ({
  isPublic,
}: SetupGoogleDriveArgs): Promise<[string | null, string]> => {
  const credentialCreationResponse = await fetch("/api/manage/credential", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      public_doc: isPublic,
      credential_json: {},
    }),
  });
  if (!credentialCreationResponse.ok) {
    return [
      null,
      `Failed to create credential - ${credentialCreationResponse.status}`,
    ];
  }
  const credential =
    (await credentialCreationResponse.json()) as Credential<{}>;

  const authorizationUrlResponse = await fetch(
    `/api/manage/connector/google-drive/authorize/${credential.id}`
  );
  if (!authorizationUrlResponse.ok) {
    return [
      null,
      `Failed to create credential - ${authorizationUrlResponse.status}`,
    ];
  }
  const authorizationUrlJson = (await authorizationUrlResponse.json()) as {
    auth_url: string;
  };

  return [authorizationUrlJson.auth_url, ""];
};
