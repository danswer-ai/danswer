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
  | "confluence";
export type ValidInputTypes = "load_state" | "poll" | "event";

// CONNECTORS
export interface ConnectorBase<T> {
  name: string;
  input_type: ValidInputTypes;
  source: ValidSources;
  connector_specific_config: T;
  refresh_freq: number;
  disabled: boolean;
}

export interface Connector<T> extends ConnectorBase<T> {
  id: number;
  credential_ids: number[];
  time_created: string;
  time_updated: string;
}

export interface GithubConfig {
  repo_owner: string;
  repo_name: string;
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
  github_token: string;
}
