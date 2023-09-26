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
  | "bookstack"
  | "confluence"
  | "jira"
  | "productboard"
  | "slab"
  | "notion"
  | "guru"
  | "zulip"
  | "linear"
  | "file";
export type ValidInputTypes = "load_state" | "poll" | "event";
export type ValidStatuses =
  | "success"
  | "failed"
  | "in_progress"
  | "not_started";

export interface DocumentBoostStatus {
  document_id: string;
  semantic_id: string;
  link: string;
  boost: number;
  hidden: boolean;
}

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
  include_prs: boolean;
  include_issues: boolean;
}

export interface GoogleDriveConfig {
  folder_paths?: string[];
  include_shared?: boolean;
  follow_shortcuts?: boolean;
}

export interface BookstackConfig {}

export interface ConfluenceConfig {
  wiki_page_url: string;
}

export interface JiraConfig {
  jira_project_url: string;
}

export interface ProductboardConfig {}

export interface SlackConfig {
  workspace: string;
  channels?: string[];
}

export interface SlabConfig {
  base_url: string;
}

export interface GuruConfig {}

export interface FileConfig {
  file_locations: string[];
}

export interface ZulipConfig {
  realm_name: string;
  realm_url: string;
}

export interface NotionConfig {}

export interface IndexAttemptSnapshot {
  status: ValidStatuses | null;
  num_docs_indexed: number;
  error_msg: string | null;
  time_started: string | null;
  time_updated: string;
}

export interface ConnectorIndexingStatus<
  ConnectorConfigType,
  ConnectorCredentialType
> {
  cc_pair_id: number;
  name: string | null;
  connector: Connector<ConnectorConfigType>;
  credential: Credential<ConnectorCredentialType>;
  public_doc: boolean;
  owner: string;
  last_status: ValidStatuses | null;
  last_success: string | null;
  docs_indexed: number;
  error_msg: string;
  latest_index_attempt: IndexAttemptSnapshot | null;
  deletion_attempt: DeletionAttemptSnapshot | null;
  is_deletable: boolean;
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

export interface BookstackCredentialJson {
  bookstack_base_url: string;
  bookstack_api_token_id: string;
  bookstack_api_token_secret: string;
}

export interface ConfluenceCredentialJson {
  confluence_username: string;
  confluence_access_token: string;
}

export interface JiraCredentialJson {
  jira_user_email: string;
  jira_api_token: string;
}

export interface ProductboardCredentialJson {
  productboard_access_token: string;
}

export interface SlackCredentialJson {
  slack_bot_token: string;
}

export interface GoogleDriveCredentialJson {
  google_drive_tokens: string;
}

export interface GoogleDriveServiceAccountCredentialJson {
  google_drive_service_account_key: string;
  google_drive_delegated_user: string;
}

export interface SlabCredentialJson {
  slab_bot_token: string;
}

export interface NotionCredentialJson {
  notion_integration_token: string;
}

export interface ZulipCredentialJson {
  zuliprc_content: string;
}

export interface GuruCredentialJson {
  guru_user: string;
  guru_user_token: string;
}

export interface LinearCredentialJson {
  linear_api_key: string;
}

// DELETION

export interface DeletionAttemptSnapshot {
  connector_id: number;
  credential_id: number;
  status: ValidStatuses;
  error_msg?: string;
  num_docs_deleted: number;
}

// DOCUMENT SETS
export interface CCPairDescriptor<ConnectorType, CredentialType> {
  id: number;
  name: string | null;
  connector: Connector<ConnectorType>;
  credential: Credential<CredentialType>;
}

export interface DocumentSet<ConnectorType, CredentialType> {
  id: number;
  name: string;
  description: string;
  cc_pair_descriptors: CCPairDescriptor<ConnectorType, CredentialType>[];
  is_up_to_date: boolean;
}

// SLACK BOT CONFIGS
export interface ChannelConfig {
  channel_names: string[];
  answer_validity_check_enabled?: boolean;
  team_members?: string[];
}

export interface SlackBotConfig {
  id: number;
  document_sets: DocumentSet<any, any>[];
  channel_config: ChannelConfig;
}

export interface SlackBotTokens {
  bot_token: string;
  app_token: string;
}
