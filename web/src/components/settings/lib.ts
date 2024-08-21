import {
  CombinedSettings,
  EnterpriseSettings,
  Settings,
} from "@/app/admin/settings/interfaces";
import {
  CUSTOM_ANALYTICS_ENABLED,
  SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED,
} from "@/lib/constants";
import { fetchSS } from "@/lib/utilsSS";
import { getWebVersion } from "@/lib/version";

export async function fetchStandardSettingsSS() {
  return fetchSS("/settings");
}

export async function fetchEnterpriseSettingsSS() {
  return fetchSS("/enterprise-settings");
}

export async function fetchCustomAnalyticsScriptSS() {
  return fetchSS("/enterprise-settings/custom-analytics-script");
}

export async function fetchSettingsSS() {
  const tasks = [fetchStandardSettingsSS()];
  if (SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED) {
    tasks.push(fetchEnterpriseSettingsSS());
    if (CUSTOM_ANALYTICS_ENABLED) {
      tasks.push(fetchCustomAnalyticsScriptSS());
    }
  }

  try {
    const results = await Promise.all(tasks);

    if (!results[0].ok) {
      throw new Error(
        `fetchStandardSettingsSS failed: status=${results[0].status} body=${await results[0].text()}`
      );
    }

    const settings = await results[0].json();

    let enterpriseSettings = null;
    if (tasks.length > 1) {
      if (!results[1].ok) {
        throw new Error(
          `fetchEnterpriseSettingsSS failed: status=${results[1].status} body=${await results[1].text()}`
        );
      }
      enterpriseSettings = (await results[1].json()) as EnterpriseSettings;
    }

    let customAnalyticsScript = null;
    if (tasks.length > 2) {
      if (!results[2].ok) {
        throw new Error(
          `fetchCustomAnalyticsScriptSS failed: status=${results[2].status} body=${await results[2].text()}`
        );
      }
      customAnalyticsScript = (await results[2].json()) as string;
    }

    const webVersion = getWebVersion();

    const combinedSettings: CombinedSettings = {
      settings,
      enterpriseSettings,
      customAnalyticsScript,
      webVersion,
    };

    return combinedSettings;
  } catch (error) {
    console.error("fetchSettingsSS exception: ", error);
    return null;
  }
}

let cachedSettings: CombinedSettings | null;

export async function getCombinedSettings({
  forceRetrieval,
}: {
  forceRetrieval?: boolean;
}): Promise<CombinedSettings | null> {
  if (!cachedSettings || forceRetrieval) {
    cachedSettings = await fetchSettingsSS();
  }
  return cachedSettings;
}
