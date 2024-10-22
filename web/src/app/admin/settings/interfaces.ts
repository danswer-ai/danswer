export interface Settings {
  chat_page_enabled: boolean;
  search_page_enabled: boolean;
  default_page: "search" | "chat";
  maximum_chat_retention_days: number | null;
  notifications: Notification[];
  needs_reindexing: boolean;
  gpu_enabled: boolean;
}

export interface Notification {
  id: number;
  notif_type: string;
  dismissed: boolean;
  last_shown: string;
  first_shown: string;
}

export interface NavigationItem {
  link: string;
  icon?: string;
  svg_logo?: string;
  title: string;
}

export interface TeamspaceSettings {
  chat_page_enabled: boolean;
  search_page_enabled: boolean;
  default_page: "search" | "chat";
  maximum_chat_retention_days: number | null;
  chat_history_enabled: boolean;
}

export interface Workspaces {
  workspace_name: string | null;
  workspace_description: string | null;
  use_custom_logo: boolean;
  use_custom_logotype: boolean;

  // custom navigation
  custom_nav_items: NavigationItem[];

  // custom Chat components
  custom_header_logo: string | null;
  custom_lower_disclaimer_content: string | null;
  custom_header_content: string | null;
  two_lines_for_chat_header: boolean | null;
  custom_popup_header: string | null;
  custom_popup_content: string | null;
  enable_consent_screen: boolean | null;
}

export interface FeatureFlags {
  profile_page: boolean;
  multi_teamspace: boolean;
  multi_workspace: boolean;
  query_history: boolean;
  whitelabelling: boolean;
  share_chat: boolean;
  explore_assistants: boolean;
  two_factor_auth: boolean;
}

export interface CombinedSettings {
  settings: Settings;
  featureFlags: FeatureFlags;
  workspaces: Workspaces | null;
  customAnalyticsScript: string | null;
}
