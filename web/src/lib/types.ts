import { Persona } from "@/app/admin/assistants/interfaces";
import { Connector } from "./connectors/connectors";
import { ConnectorCredentialPairStatus } from "@/app/admin/connector/[ccPairId]/types";
import { Credential } from "./connectors/credentials";

export interface UserPreferences {
  chosen_assistants: number[] | null;
  default_model: string | null;
}

export enum UserStatus {
  live = "live",
  invited = "invited",
  deactivated = "deactivated",
}

export enum UserRole {
  BASIC = "basic",
  ADMIN = "admin",
  CURATOR = "curator",
  GLOBAL_CURATOR = "global_curator",
}

export interface User {
  id: string;
  email: string;
  is_active: string;
  is_superuser: string;
  is_verified: string;
  role: UserRole;
  preferences: UserPreferences;
  status: UserStatus;
  current_token_created_at?: Date;
  current_token_expiry_length?: number;
  oidc_expiry?: Date;
}

export interface MinimalUserSnapshot {
  id: string;
  email: string;
}

export type ValidInputTypes = "load_state" | "poll" | "event";
export type ValidStatuses =
  | "success"
  | "completed_with_errors"
  | "failed"
  | "in_progress"
  | "not_started";
export type TaskStatus = "PENDING" | "STARTED" | "SUCCESS" | "FAILURE";
export type Feedback = "like" | "dislike";

export interface DocumentBoostStatus {
  document_id: string;
  semantic_id: string;
  link: string;
  boost: number;
  hidden: boolean;
}

export interface FailedConnectorIndexingStatus {
  cc_pair_id: number;
  name: string | null;
  error_msg: string | null;
  is_deletable: boolean;
  connector_id: number;
  credential_id: number;
}

export interface IndexAttemptSnapshot {
  id: number;
  status: ValidStatuses | null;
  new_docs_indexed: number;
  docs_removed_from_index: number;
  total_docs_indexed: number;
  error_msg: string | null;
  error_count: number;
  full_exception_trace: string | null;
  time_started: string | null;
  time_updated: string;
}

export interface ConnectorIndexingStatus<
  ConnectorConfigType,
  ConnectorCredentialType,
> {
  cc_pair_id: number;
  name: string | null;
  cc_pair_status: ConnectorCredentialPairStatus;
  connector: Connector<ConnectorConfigType>;
  credential: Credential<ConnectorCredentialType>;
  public_doc: boolean;
  owner: string;
  groups: number[];
  last_finished_status: ValidStatuses | null;
  last_status: ValidStatuses | null;
  last_success: string | null;
  docs_indexed: number;
  error_msg: string;
  latest_index_attempt: IndexAttemptSnapshot | null;
  deletion_attempt: DeletionAttemptSnapshot | null;
  is_deletable: boolean;
}

export interface CCPairBasicInfo {
  docs_indexed: number;
  has_successful_run: boolean;
  source: ValidSources;
}

export type ConnectorSummary = {
  count: number;
  active: number;
  public: number;
  totalDocsIndexed: number;
  errors: number; // New field for error count
};

export interface GithubCredentialJson {
  github_access_token: string;
}

export interface GitlabCredentialJson {
  gitlab_url: string;
  gitlab_access_token: string;
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

export interface JiraServerCredentialJson {
  jira_api_token: string;
  is_server_8_13_or_under: boolean;
}

export interface ProductboardCredentialJson {
  productboard_access_token: string;
}

export interface SlackCredentialJson {
  slack_bot_token: string;
}

export interface GmailCredentialJson {
  gmail_tokens: string;
}

export interface GoogleDriveCredentialJson {
  google_drive_tokens: string;
}

export interface GmailServiceAccountCredentialJson {
  gmail_service_account_key: string;
  gmail_delegated_user: string;
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

export interface GongCredentialJson {
  gong_access_key: string;
  gong_access_key_secret: string;
}

export interface LoopioCredentialJson {
  loopio_subdomain: string;
  loopio_client_id: string;
  loopio_client_token: string;
}

export interface LinearCredentialJson {
  linear_api_key: string;
}

export interface HubSpotCredentialJson {
  hubspot_access_token: string;
}

export interface RequestTrackerCredentialJson {
  requesttracker_username: string;
  requesttracker_password: string;
  requesttracker_base_url: string;
}

export interface Document360CredentialJson {
  portal_id: string;
  document360_api_token: string;
}

export interface ClickupCredentialJson {
  clickup_api_token: string;
  clickup_team_id: string;
}

export interface ZendeskCredentialJson {
  zendesk_subdomain: string;
  zendesk_email: string;
  zendesk_token: string;
}

export interface DropboxCredentialJson {
  dropbox_access_token: string;
}

export interface R2CredentialJson {
  account_id: string;
  r2_access_key_id: string;
  r2_secret_access_key: string;
}

export interface S3CredentialJson {
  aws_access_key_id: string;
  aws_secret_access_key: string;
}

export interface GCSCredentialJson {
  access_key_id: string;
  secret_access_key: string;
}

export interface OCICredentialJson {
  namespace: string;
  region: string;
  access_key_id: string;
  secret_access_key: string;
}
export interface SalesforceCredentialJson {
  sf_username: string;
  sf_password: string;
  sf_security_token: string;
}

export interface SharepointCredentialJson {
  sp_client_id: string;
  sp_client_secret: string;
  sp_directory_id: string;
}

export interface TeamsCredentialJson {
  teams_client_id: string;
  teams_client_secret: string;
  teams_directory_id: string;
}

export interface DiscourseCredentialJson {
  discourse_api_key: string;
  discourse_api_username: string;
}

export interface AxeroCredentialJson {
  base_url: string;
  axero_api_token: string;
}

export interface MediaWikiCredentialJson {}
export interface WikipediaCredentialJson extends MediaWikiCredentialJson {}

// DELETION
export interface DeletionAttemptSnapshot {
  connector_id: number;
  credential_id: number;
  status: TaskStatus;
}

// DOCUMENT SETS
export interface CCPairDescriptor<ConnectorType, CredentialType> {
  id: number;
  name: string | null;
  connector: Connector<ConnectorType>;
  credential: Credential<CredentialType>;
}

export interface DocumentSet {
  id: number;
  name: string;
  description: string;
  cc_pair_descriptors: CCPairDescriptor<any, any>[];
  is_up_to_date: boolean;
  is_public: boolean;
  users: string[];
  groups: number[];
}

export interface Tag {
  tag_key: string;
  tag_value: string;
  source: ValidSources;
}

// STANDARD ANSWERS
export interface StandardAnswerCategory {
  id: number;
  name: string;
}

export interface StandardAnswer {
  id: number;
  keyword: string;
  answer: string;
  match_regex: boolean;
  match_any_keywords: boolean;
  categories: StandardAnswerCategory[];
}

// SLACK BOT CONFIGS

export type AnswerFilterOption =
  | "well_answered_postfilter"
  | "questionmark_prefilter";

export interface ChannelConfig {
  channel_names: string[];
  respond_tag_only?: boolean;
  respond_to_bots?: boolean;
  respond_member_group_list?: string[];
  answer_filters?: AnswerFilterOption[];
  follow_up_tags?: string[];
}

export type SlackBotResponseType = "quotes" | "citations";

export interface SlackBotConfig {
  id: number;
  persona: Persona | null;
  channel_config: ChannelConfig;
  response_type: SlackBotResponseType;
  standard_answer_categories: StandardAnswerCategory[];
  enable_auto_filters: boolean;
}

export interface SlackBotTokens {
  bot_token: string;
  app_token: string;
}

/* EE Only Types */
export interface UserGroup {
  id: number;
  name: string;
  users: User[];
  curator_ids: string[];
  cc_pairs: CCPairDescriptor<any, any>[];
  document_sets: DocumentSet[];
  personas: Persona[];
  is_up_to_date: boolean;
  is_up_for_deletion: boolean;
}

const validSources = [
  "web",
  "github",
  "gitlab",
  "slack",
  "google_drive",
  "gmail",
  "bookstack",
  "confluence",
  "jira",
  "productboard",
  "slab",
  "notion",
  "guru",
  "gong",
  "zulip",
  "linear",
  "hubspot",
  "document360",
  "requesttracker",
  "file",
  "google_sites",
  "loopio",
  "dropbox",
  "salesforce",
  "sharepoint",
  "teams",
  "zendesk",
  "discourse",
  "axero",
  "clickup",
  "wikipedia",
  "mediawiki",
  "s3",
  "r2",
  "google_cloud_storage",
  "oci_storage",
  "not_applicable",
  "ingestion_api",
] as const;

export type ValidSources = (typeof validSources)[number];
// The valid sources that are actually valid to select in the UI
export type ConfigurableSources = Exclude<
  ValidSources,
  "not_applicable" | "ingestion_api"
>;
