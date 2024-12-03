import { OAuthPrepareAuthorizationResponse } from "./types";

export async function prepareOAuthAuthorizationRequest(
  connector: string,
  finalRedirect: string | null // a redirect (not the oauth redirect) for the user to return to after oauth is complete)
): Promise<OAuthPrepareAuthorizationResponse> {
  let url = `/api/oauth/prepare-authorization-request?connector=${encodeURIComponent(
    connector
  )}`;

  // Conditionally append the `redirect_on_success` parameter
  if (finalRedirect) {
    url += `&redirect_on_success=${encodeURIComponent(finalRedirect)}`;
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      connector: connector,
      redirect_on_success: finalRedirect,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Failed to prepare OAuth authorization request: ${response.status}`
    );
  }

  // Parse the JSON response
  const data = (await response.json()) as OAuthPrepareAuthorizationResponse;
  return data;
}
