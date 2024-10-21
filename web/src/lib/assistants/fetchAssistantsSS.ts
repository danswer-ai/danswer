import { Assistant } from "@/app/admin/assistants/interfaces";
import { fetchSS } from "../utilsSS";

export type FetchAssistantsResponse = [Assistant[], string | null];

export async function fetchAssistantsSS(): Promise<FetchAssistantsResponse> {
  const response = await fetchSS("/assistant");
  if (response.ok) {
    return [(await response.json()) as Assistant[], null];
  }
  return [[], (await response.json()).detail || "Unknown Error"];
}
