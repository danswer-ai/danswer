import { Settings } from "@/app/admin/settings/interfaces";
import { buildUrl } from "./utilsSS";

export async function getSettingsSS(): Promise<Settings | null> {
  const response = await fetch(buildUrl("/settings"));
  if (response.ok) {
    return await response.json();
  }
  return null;
}
