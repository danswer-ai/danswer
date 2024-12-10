import { ValidSources } from "../types";

export async function getConnectorOauthRedirectUrl(
  connector: ValidSources
): Promise<string | null> {
  const response = await fetch(`/api/connector/oauth/authorize/${connector}`);

  if (!response.ok) {
    console.error(`Failed to fetch OAuth redirect URL for ${connector}`);
    return null;
  }

  const data = await response.json();
  return data.redirect_url as string;
}

export async function getSourceHasStandardOAuthSupport(
  source: ValidSources
): Promise<boolean> {
  const response = await fetch("/api/connector/oauth/available-sources");
  const sources = (await response.json()) as ValidSources[];
  return sources.includes(source);
}
