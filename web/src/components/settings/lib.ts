import { Workspaces, Settings } from "@/app/admin/settings/interfaces";
import {
  CUSTOM_ANALYTICS_ENABLED,
  SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED,
} from "@/lib/constants";
import { fetchSS } from "@/lib/utilsSS";

export async function fetchSettingsSS() {
  const tasks = [fetchSS("/settings")];
  if (SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED) {
    tasks.push(fetchSS("/workspace"));
    if (CUSTOM_ANALYTICS_ENABLED) {
      tasks.push(fetchSS("/workspace/custom-analytics-script"));
    }
  }

  const results = await Promise.all(tasks);

  const settings = (await results[0].json()) as Settings;
  const workspaces =
    tasks.length > 1 ? ((await results[1].json()) as Workspaces) : null;
  const customAnalyticsScript = (
    tasks.length > 2 ? await results[2].json() : null
  ) as string | null;

  const combinedSettings: CombinedSettings = {
    settings,
    workspaces,
    customAnalyticsScript,
  };

  return combinedSettings;
}

export interface CombinedSettings {
  settings: Settings;
  workspaces: Workspaces | null;
  customAnalyticsScript: string | null;
}

let cachedSettings: CombinedSettings;

export async function getCombinedSettings({
  forceRetrieval,
}: {
  forceRetrieval?: boolean;
}): Promise<CombinedSettings> {
  if (!cachedSettings || forceRetrieval) {
    cachedSettings = await fetchSettingsSS();
  }
  return cachedSettings;
}
