import {
  EnterpriseSettings,
  FeatureFlags,
  Settings,
} from "@/app/admin/settings/interfaces";
import {
  CUSTOM_ANALYTICS_ENABLED,
  SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED,
} from "@/lib/constants";
import { fetchSS } from "@/lib/utilsSS";

export async function fetchSettingsSS() {
  const tasks = [fetchSS("/settings"), fetchSS("/ff")];
  if (SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED) {
    tasks.push(fetchSS("/enterprise-settings"));
    if (CUSTOM_ANALYTICS_ENABLED) {
      tasks.push(fetchSS("/enterprise-settings/custom-analytics-script"));
    }
  }

  const results = await Promise.all(tasks);

  const settings = (await results[0].json()) as Settings;
  const featureFlags = (await results[1].json()) as FeatureFlags;
  const enterpriseSettings =
    tasks.length > 2 ? ((await results[2].json()) as EnterpriseSettings) : null;
  const customAnalyticsScript = (
    tasks.length > 3 ? await results[3].json() : null
  ) as string | null;

  const combinedSettings: CombinedSettings = {
    settings,
    featureFlags,
    enterpriseSettings,
    customAnalyticsScript,
  };

  return combinedSettings;
}

export interface CombinedSettings {
  settings: Settings;
  enterpriseSettings: EnterpriseSettings | null;
  customAnalyticsScript: string | null;
  featureFlags: FeatureFlags;
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
