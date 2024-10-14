import { Persona } from "@/app/admin/assistants/interfaces";
import { fetchSS } from "../utilsSS";

export async function fetchAssistantSS(
  personaId: number
): Promise<Persona | null> {
  const response = await fetchSS(
    `/persona/${personaId}?include_non_owned=true`
  );
  if (response.ok) {
    return (await response.json()) as Persona;
  }
  return null;
}
