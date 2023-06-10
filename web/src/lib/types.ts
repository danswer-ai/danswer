export interface User {
  id: string;
  email: string;
  is_active: string;
  is_superuser: string;
  is_verified: string;
  role: "basic" | "admin";
}

export type ValidSources =
  | "web"
  | "github"
  | "slack"
  | "google_drive"
  | "confluence"
  | "file";
export type ValidInputTypes = "load_state" | "poll" | "event";

// CONNECTORS
export interface ConnectorBase<T> {
  name: string;
  input_type: ValidInputTypes;
  source: ValidSources;
  connector_specific_config: T;
  refresh_freq: number | null;
  disabled: boolean;
}

export interface Connector<T> extends ConnectorBase<T> {
  id: number;
  credential_ids: number[];
  time_created: string;
  time_updated: string;
}

export interface WebConfig {
  base_url: string;
}

export interface GithubConfig {
  repo_owner: string;
  repo_name: string;
}

export interface ConfluenceConfig {
  wiki_page_url: string;
}

export interface SlackConfig {
  workspace: string;
}

export interface FileConfig {
  file_locations: string[];
}

export interface ConnectorIndexingStatus<T> {
  connector: Connector<T>;
  public_doc: boolean;
  owner: string;
  last_status: "success" | "failed" | "in_progress" | "not_started";
  last_success: string | null;
  docs_indexed: number;
}

// CREDENTIALS
export interface CredentialBase<T> {
  credential_json: T;
  public_doc: boolean;
}

export interface Credential<T> extends CredentialBase<T> {
  id: number;
  user_id: number | null;
  time_created: string;
  time_updated: string;
}

export interface GithubCredentialJson {
  github_access_token: string;
}

export interface ConfluenceCredentialJson {
  confluence_username: string;
  confluence_access_token: string;
}

export interface SlackCredentialJson {
  slack_bot_token: string;
}

export interface GoogleDriveCredentialJson {
  google_drive_tokens: string;
}
