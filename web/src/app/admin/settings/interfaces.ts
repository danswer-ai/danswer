export interface Settings {
  chat_page_enabled: boolean;
  search_page_enabled: boolean;
  default_page: "search" | "chat";
  maximum_chat_retention_days: number | null;
}

export interface Workspaces {
  workspace_name: string | null;
  workspace_description: string | null;
  use_custom_logo: boolean;

  // custom Chat components
  custom_header_logo: string | null;
  custom_header_content: string | null;
}

export interface CombinedSettings {
  settings: Settings;
  workspaces: Workspaces | null;
  customAnalyticsScript: string | null;
}
