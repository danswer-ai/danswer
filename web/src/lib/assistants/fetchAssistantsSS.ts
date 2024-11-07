import { Assistant } from "@/app/admin/assistants/interfaces";
import { fetchSS } from "../utilsSS";

export type FetchAssistantsResponse = [Assistant[], string | null];

export async function fetchAssistantsSS(
  teamspaceId?: string
): Promise<FetchAssistantsResponse> {
  const url = teamspaceId
    ? `/assistant?teamspace_id=${teamspaceId}`
    : "/assistant";
  const response = await fetchSS(url);

  if (response.ok) {
    const data = await response.json();
    return [data as Assistant[], null];
  }

  const errorDetail = (await response.json()).detail || "Unknown Error";
  return [[], errorDetail];
}
