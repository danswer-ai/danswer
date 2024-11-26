import {
  Workspaces,
  FeatureFlags,
  CombinedSettings,
  Settings,
} from "@/app/admin/settings/interfaces";
import {
  CUSTOM_ANALYTICS_ENABLED,
  SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED,
} from "@/lib/constants";
import { fetchSS } from "@/lib/utilsSS";

export enum SettingsError {
  OTHER = "OTHER",
}

export async function fetchStandardSettingsSS() {
  return fetchSS("/settings");
}

export async function fetchFeatureFlagSS() {
  return fetchSS("/ff");
}

export async function fetchWorkspaceThemesSS() {
  return fetchSS("/themes");
}

export async function fetchEnterpriseSettingsSS() {
  return fetchSS("/workspace");
}

export async function fetchCustomAnalyticsScriptSS() {
  return fetchSS("/workspace/custom-analytics-script");
}

export async function fetchSettingsSS(): Promise<CombinedSettings | null> {
  const tasks = [fetchStandardSettingsSS()];
  if (SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED) {
    tasks.push(fetchEnterpriseSettingsSS());
    if (CUSTOM_ANALYTICS_ENABLED) {
      tasks.push(fetchCustomAnalyticsScriptSS());
    }
  }

  try {
    const results = await Promise.all(tasks);

    let settings: Settings;
    if (!results[0].ok) {
      if (results[0].status === 403) {
        settings = {
          gpu_enabled: false,
          chat_page_enabled: true,
          search_page_enabled: true,
          default_page: "search",
          maximum_chat_retention_days: null,
          notifications: [],
          needs_reindexing: false,
          smtp_server: "",
          smtp_port: 0,
          smtp_username: "",
          smtp_password: "",
        };
      } else {
        throw new Error(
          `fetchStandardSettingsSS failed: status=${results[0].status} body=${await results[0].text()}`
        );
      }
    } else {
      settings = await results[0].json();
    }

    let workspaces: Workspaces | null = null;
    if (tasks.length > 1) {
      if (!results[1].ok) {
        if (results[1].status !== 403) {
          throw new Error(
            `fetchWorkspaceSS failed: status=${results[1].status} body=${await results[1].text()}`
          );
        }
      } else {
        workspaces = await results[1].json();
      }
    }

    let customAnalyticsScript: string | null = null;
    if (tasks.length > 2) {
      if (!results[2].ok) {
        if (results[2].status !== 403) {
          throw new Error(
            `fetchCustomAnalyticsScriptSS failed: status=${results[2].status} body=${await results[2].text()}`
          );
        }
      } else {
        customAnalyticsScript = await results[2].json();
      }
    }

    const combinedSettings: CombinedSettings = {
      settings,
      workspaces,
      customAnalyticsScript,
    };

    return combinedSettings;
  } catch (error) {
    console.error("fetchSettingsSS exception: ", error);
    return null;
  }
}
