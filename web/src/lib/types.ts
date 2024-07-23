import { ConnectionConfiguration } from "@/app/add/[connector]/types";
import { Persona } from "@/app/admin/assistants/interfaces";

export interface UserPreferences {
  chosen_assistants: number[] | null;
}

export enum UserStatus {
  live = "live",
  invited = "invited",
  deactivated = "deactivated",
}

export interface User {
  id: string;
  email: string;
  is_active: string;
  is_superuser: string;
  is_verified: string;
  role: "basic" | "admin";
  preferences: UserPreferences;
  status: UserStatus;
}

export interface MinimalUserSnapshot {
  id: string;
  email: string;
}

export type ValidSources =
  | "web"
  | "github"
  | "gitlab"
  | "slack"
  | "google_drive"
  | "gmail"
  | "bookstack"
  | "confluence"
  | "jira"
  | "productboard"
  | "slab"
  | "notion"
  | "guru"
  | "gong"
  | "zulip"
  | "linear"
  | "hubspot"
  | "document360"
  | "requesttracker"
  | "file"
  | "google_sites"
  | "loopio"
  | "dropbox"
  | "salesforce"
  | "sharepoint"
  | "teams"
  | "zendesk"
  | "discourse"
  | "axero"
  | "clickup"
  | "axero"
  | "wikipedia"
  | "mediawiki"
  | "s3"
  | "r2"
  | "google_cloud_storage"
  | "oci_storage"
  | "not_applicable";

export type ValidInputTypes = "load_state" | "poll" | "event";
export type ValidStatuses =
  | "success"
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

// CONNECTORS
export interface ConnectorBase<T> {
  name: string;
  source: ValidSources;
  input_type: ValidInputTypes;
  connector_specific_config: T;
  refresh_freq: number | null;
  prune_freq: number | null;
  indexing_start: Date | null;
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
  web_connector_type?: "recursive" | "single" | "sitemap";
}

export interface GithubConfig {
  repo_owner: string;
  repo_name: string;
  include_prs: boolean;
  include_issues: boolean;
}

export interface GitlabConfig {
  project_owner: string;
  project_name: string;
  include_mrs: boolean;
  include_issues: boolean;
}

export interface GoogleDriveConfig {
  folder_paths?: string[];
  include_shared?: boolean;
  follow_shortcuts?: boolean;
  only_org_public?: boolean;
}

export interface GmailConfig {}

export interface BookstackConfig {}

export interface ConfluenceConfig {
  wiki_page_url: string;
  index_origin?: boolean;
}

export interface JiraConfig {
  jira_project_url: string;
  comment_email_blacklist?: string[];
}

export interface SalesforceConfig {
  requested_objects?: string[];
}

export interface SharepointConfig {
  sites?: string[];
}

export interface TeamsConfig {
  teams?: string[];
}

export interface DiscourseConfig {
  base_url: string;
  categories?: string[];
}

export interface AxeroConfig {
  spaces?: string[];
}

export interface TeamsConfig {
  teams?: string[];
}

export interface ProductboardConfig {}

export interface SlackConfig {
  workspace: string;
  channels?: string[];
  channel_regex_enabled?: boolean;
}

export interface SlabConfig {
  base_url: string;
}

export interface GuruConfig {}

export interface GongConfig {
  workspaces?: string[];
}

export interface LoopioConfig {
  loopio_stack_name?: string;
}

export interface FileConfig {
  file_locations: string[];
}

export interface ZulipConfig {
  realm_name: string;
  realm_url: string;
}

export interface NotionConfig {
  root_page_id?: string;
}

export interface HubSpotConfig {}

export interface RequestTrackerConfig {}

export interface Document360Config {
  workspace: string;
  categories?: string[];
}

export interface ClickupConfig {
  connector_type: "list" | "folder" | "space" | "workspace";
  connector_ids?: string[];
  retrieve_task_comments: boolean;
}

export interface GoogleSitesConfig {
  zip_path: string;
  base_url: string;
}

export interface ZendeskConfig {}

export interface DropboxConfig {}

export interface S3Config {
  bucket_type: "s3";
  bucket_name: string;
  prefix: string;
}

export interface R2Config {
  bucket_type: "r2";
  bucket_name: string;
  prefix: string;
}

export interface GCSConfig {
  bucket_type: "google_cloud_storage";
  bucket_name: string;
  prefix: string;
}

export interface OCIConfig {
  bucket_type: "oci_storage";
  bucket_name: string;
  prefix: string;
}

export interface MediaWikiBaseConfig {
  connector_name: string;
  language_code: string;
  categories?: string[];
  pages?: string[];
  recurse_depth?: number;
}

export interface MediaWikiConfig extends MediaWikiBaseConfig {
  hostname: string;
}

export interface WikipediaConfig extends MediaWikiBaseConfig {}

export interface IndexAttemptSnapshot {
  id: number;
  status: ValidStatuses | null;
  new_docs_indexed: number;
  docs_removed_from_index: number;
  total_docs_indexed: number;
  error_msg: string | null;
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

export type GroupedConnectorSummaries = Record<ValidSources, ConnectorSummary>;

// CREDENTIALS
export interface CredentialBase<T> {
  credential_json: T;
  admin_public: boolean;
  source: ValidSources;
  name?: string;
}

export interface Credential<T> extends CredentialBase<T> {
  id: number;
  name?: string;
  user_id: string | null;
  time_created: string;
  time_updated: string;
}
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
  cc_pairs: CCPairDescriptor<any, any>[];
  document_sets: DocumentSet[];
  personas: Persona[];
  is_up_to_date: boolean;
  is_up_for_deletion: boolean;
}

export const credentialDisplayNames: Record<string, string> = {
  // Github
  github_access_token: "GitHub Access Token",

  // Gitlab
  gitlab_url: "GitLab URL",
  gitlab_access_token: "GitLab Access Token",

  // Bookstack
  bookstack_base_url: "Bookstack Base URL",
  bookstack_api_token_id: "Bookstack API Token ID",
  bookstack_api_token_secret: "Bookstack API Token Secret",

  // Confluence
  confluence_username: "Confluence Username",
  confluence_access_token: "Confluence Access Token",

  // Jira
  jira_user_email: "Jira User Email",
  jira_api_token: "Jira API Token",

  // Productboard
  productboard_access_token: "Productboard Access Token",

  // Slack
  slack_bot_token: "Slack Bot Token",

  // Gmail
  gmail_tokens: "Gmail Tokens",

  // Google Drive
  google_drive_tokens: "Google Drive Tokens",

  // Gmail Service Account
  gmail_service_account_key: "Gmail Service Account Key",
  gmail_delegated_user: "Gmail Delegated User",

  // Google Drive Service Account
  google_drive_service_account_key: "Google Drive Service Account Key",
  google_drive_delegated_user: "Google Drive Delegated User",

  // Slab
  slab_bot_token: "Slab Bot Token",

  // Notion
  notion_integration_token: "Notion Integration Token",

  // Zulip
  zuliprc_content: "Zuliprc Content",

  // Guru
  guru_user: "Guru User",
  guru_user_token: "Guru User Token",

  // Gong
  gong_access_key: "Gong Access Key",
  gong_access_key_secret: "Gong Access Key Secret",

  // Loopio
  loopio_subdomain: "Loopio Subdomain",
  loopio_client_id: "Loopio Client ID",
  loopio_client_token: "Loopio Client Token",

  // Linear
  linear_api_key: "Linear API Key",

  // HubSpot
  hubspot_access_token: "HubSpot Access Token",

  // Request Tracker
  requesttracker_username: "Request Tracker Username",
  requesttracker_password: "Request Tracker Password",
  requesttracker_base_url: "Request Tracker Base URL",

  // Document360
  portal_id: "Document360 Portal ID",
  document360_api_token: "Document360 API Token",

  // Clickup
  clickup_api_token: "ClickUp API Token",
  clickup_team_id: "ClickUp Team ID",

  // Zendesk
  zendesk_subdomain: "Zendesk Subdomain",
  zendesk_email: "Zendesk Email",
  zendesk_token: "Zendesk Token",

  // Dropbox
  dropbox_access_token: "Dropbox API Key",

  // R2
  account_id: "R2 Account ID",
  r2_access_key_id: "R2 Access Key ID",
  r2_secret_access_key: "R2 Secret Access Key",

  // S3
  aws_access_key_id: "AWS Access Key ID",
  aws_secret_access_key: "AWS Secret Access Key",

  // GCS
  access_key_id: "GCS Access Key ID",
  secret_access_key: "GCS Secret Access Key",

  // OCI
  namespace: "OCI Namespace",
  region: "OCI Region",

  // Salesforce
  sf_username: "Salesforce Username",
  sf_password: "Salesforce Password",
  sf_security_token: "Salesforce Security Token",

  // Sharepoint
  sp_client_id: "SharePoint Client ID",
  sp_client_secret: "SharePoint Client Secret",
  sp_directory_id: "SharePoint Directory ID",

  // Teams
  teams_client_id: "Microsoft Teams Client ID",
  teams_client_secret: "Microsoft Teams Client Secret",
  teams_directory_id: "Microsoft Teams Directory ID",

  // Discourse
  discourse_api_key: "Discourse API Key",
  discourse_api_username: "Discourse API Username",

  // Axero
  base_url: "Axero Base URL",
  axero_api_token: "Axero API Token",
};
export function getDisplayNameForCredentialKey(key: string): string {
  return credentialDisplayNames[key] || key;
}

export type CredentialJsonMap = {
  [K in ValidSources]: K extends
    | "web"
    | "file"
    | "google_sites"
    | "not_applicable"
    ? null
    : K extends "google_drive"
      ? GoogleDriveCredentialJson | GoogleDriveServiceAccountCredentialJson
      : K extends "gmail"
        ? GmailCredentialJson | GmailServiceAccountCredentialJson
        : K extends "jira"
          ? JiraCredentialJson | JiraServerCredentialJson
          : K extends "github"
            ? GithubCredentialJson
            : K extends "gitlab"
              ? GitlabCredentialJson
              : K extends "slack"
                ? SlackCredentialJson
                : K extends "bookstack"
                  ? BookstackCredentialJson
                  : K extends "confluence"
                    ? ConfluenceCredentialJson
                    : K extends "productboard"
                      ? ProductboardCredentialJson
                      : K extends "slab"
                        ? SlabCredentialJson
                        : K extends "notion"
                          ? NotionCredentialJson
                          : K extends "guru"
                            ? GuruCredentialJson
                            : K extends "gong"
                              ? GongCredentialJson
                              : K extends "zulip"
                                ? ZulipCredentialJson
                                : K extends "linear"
                                  ? LinearCredentialJson
                                  : K extends "hubspot"
                                    ? HubSpotCredentialJson
                                    : K extends "document360"
                                      ? Document360CredentialJson
                                      : K extends "requesttracker"
                                        ? RequestTrackerCredentialJson
                                        : K extends "loopio"
                                          ? LoopioCredentialJson
                                          : K extends "dropbox"
                                            ? DropboxCredentialJson
                                            : K extends "salesforce"
                                              ? SalesforceCredentialJson
                                              : K extends "sharepoint"
                                                ? SharepointCredentialJson
                                                : K extends "teams"
                                                  ? TeamsCredentialJson
                                                  : K extends "zendesk"
                                                    ? ZendeskCredentialJson
                                                    : K extends "discourse"
                                                      ? DiscourseCredentialJson
                                                      : K extends "axero"
                                                        ? AxeroCredentialJson
                                                        : K extends "clickup"
                                                          ? ClickupCredentialJson
                                                          : K extends "wikipedia"
                                                            ? WikipediaCredentialJson
                                                            : K extends "mediawiki"
                                                              ? MediaWikiCredentialJson
                                                              : K extends "s3"
                                                                ? S3CredentialJson
                                                                : K extends "r2"
                                                                  ? R2CredentialJson
                                                                  : K extends "google_cloud_storage"
                                                                    ? GCSCredentialJson
                                                                    : K extends "oci_storage"
                                                                      ? OCICredentialJson
                                                                      : never;
};

// Type guard function to check if a string is a valid source
export function isValidSource(source: string): source is ValidSources {
  return [
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
  ].includes(source);
}

// Helper function to get credential JSON type for a given source
export function getCredentialJsonType<T extends ValidSources>(
  source: T
): CredentialJsonMap[T] {
  return null as any as CredentialJsonMap[T]; // This is a type-level operation, it doesn't actually return a value
}

export const getCredentialTemplate = <T extends ValidSources>(
  source: T
): any => {
  switch (source) {
    case "github":
      return { github_access_token: "" } as GithubCredentialJson;
    case "gitlab":
      return {
        gitlab_url: "",
        gitlab_access_token: "",
      } as GitlabCredentialJson;
    case "slack":
      return { slack_bot_token: "" } as SlackCredentialJson;
    case "google_drive":
      return { google_drive_tokens: "" } as GoogleDriveCredentialJson;
    case "gmail":
      return { gmail_tokens: "" } as GmailCredentialJson;
    case "bookstack":
      return {
        bookstack_base_url: "",
        bookstack_api_token_id: "",
        bookstack_api_token_secret: "",
      } as BookstackCredentialJson;
    case "confluence":
      return {
        confluence_username: "",
        confluence_access_token: "",
      } as ConfluenceCredentialJson;
    case "jira":
      return {
        jira_user_email: "",
        jira_api_token: "",
      } as JiraCredentialJson;
    case "productboard":
      return { productboard_access_token: "" } as ProductboardCredentialJson;
    case "slab":
      return { slab_bot_token: "" } as SlabCredentialJson;
    case "notion":
      return { notion_integration_token: "" } as NotionCredentialJson;
    case "guru":
      return { guru_user: "", guru_user_token: "" } as GuruCredentialJson;
    case "gong":
      return {
        gong_access_key: "",
        gong_access_key_secret: "",
      } as GongCredentialJson;
    case "zulip":
      return { zuliprc_content: "" } as ZulipCredentialJson;
    case "google_sites":
      return "sites";
    case "file":
      return "file";
    case "linear":
      return { linear_api_key: "" } as LinearCredentialJson;
    case "hubspot":
      return { hubspot_access_token: "" } as HubSpotCredentialJson;
    case "document360":
      return {
        portal_id: "",
        document360_api_token: "",
      } as Document360CredentialJson;
    case "requesttracker":
      return {
        requesttracker_username: "",
        requesttracker_password: "",
        requesttracker_base_url: "",
      } as RequestTrackerCredentialJson;
    case "loopio":
      return {
        loopio_subdomain: "",
        loopio_client_id: "",
        loopio_client_token: "",
      } as LoopioCredentialJson;
    case "dropbox":
      return { dropbox_access_token: "" } as DropboxCredentialJson;
    case "salesforce":
      return {
        sf_username: "",
        sf_password: "",
        sf_security_token: "",
      } as SalesforceCredentialJson;
    case "sharepoint":
      return {
        sp_client_id: "",
        sp_client_secret: "",
        sp_directory_id: "",
      } as SharepointCredentialJson;
    case "teams":
      return {
        teams_client_id: "",
        teams_client_secret: "",
        teams_directory_id: "",
      } as TeamsCredentialJson;
    case "zendesk":
      return {
        zendesk_subdomain: "",
        zendesk_email: "",
        zendesk_token: "",
      } as ZendeskCredentialJson;
    case "discourse":
      return {
        discourse_api_key: "",
        discourse_api_username: "",
      } as DiscourseCredentialJson;
    case "axero":
      return {
        base_url: "",
        axero_api_token: "",
      } as AxeroCredentialJson;
    case "clickup":
      return {
        clickup_api_token: "",
        clickup_team_id: "",
      } as ClickupCredentialJson;
    case "wikipedia":
    case "mediawiki":
      return "wiki";
    case "s3":
      return {
        aws_access_key_id: "",
        aws_secret_access_key: "",
      } as S3CredentialJson;
    case "r2":
      return {
        account_id: "",
        r2_access_key_id: "",
        r2_secret_access_key: "",
      } as R2CredentialJson;
    case "google_cloud_storage":
      return {
        access_key_id: "",
        secret_access_key: "",
      } as GCSCredentialJson;
    case "oci_storage":
      return {
        namespace: "",
        region: "",
        access_key_id: "",
        secret_access_key: "",
      } as OCICredentialJson;
    case "web":
      return "web";
    case "file":
    case "not_applicable":
    default:
      return null;
  }
};

// Type definitions
export type InputType =
  | "list"
  | "text"
  | "select"
  | "multiselect"
  | "boolean"
  | "number"
  | "file";

// Updated function

export const getComprehensiveConnectorConfigTemplate = <T extends ValidSources>(
  source: T
): ConnectionConfiguration => {
  switch (source) {
    case "web":
      return {
        description: "Configure Web connector",
        values: [
          {
            type: "text",
            query:
              "Enter the website URL to scrape e.g. https://docs.danswer.dev/:",
            label: "Base URL",
            name: "base_url",
            optional: false,
          },
          {
            type: "select",
            query: "Select the web connector type:",
            label: "Scrape Method",
            name: "web_connector_type",
            optional: true,
            options: [
              { name: "recursive", value: "recursive" },
              { name: "single", value: "single" },
              { name: "sitemap", value: "sitemap" },
            ],
          },
        ],
      };

    case "github":
      return {
        description: "Configure GitHub connector",
        values: [
          {
            type: "text",
            query: "Enter the repository owner:",
            label: "Repository Owner",
            name: "repo_owner",
            optional: false,
          },
          {
            type: "text",
            query: "Enter the repository name:",
            label: "Repository Name",
            name: "repo_name",
            optional: false,
          },
          {
            type: "checkbox",
            query: "Include pull requests?",
            label: "Include pull requests?",
            description: "Index pull requests from this repository",
            name: "include_prs",
            optional: true,
          },
          {
            type: "checkbox",
            query: "Include issues?",
            label: "Include Issues",
            name: "include_issues",
            description: "Index issues from this repository",
            optional: true,
          },
        ],
      };

    case "gitlab":
      return {
        description: "Configure GitLab connector",
        values: [
          {
            type: "text",
            query: "Enter the project owner:",
            label: "Project Owner",
            name: "project_owner",
            optional: false,
          },
          {
            type: "text",
            query: "Enter the project name:",
            label: "Project Name",
            name: "project_name",
            optional: false,
          },
          {
            type: "checkbox",
            query: "Include merge requests?",
            label: "Include MRs",
            name: "include_mrs",
            default: true,
            hidden: true,
          },
          {
            type: "checkbox",
            query: "Include issues?",
            label: "Include Issues",
            name: "include_issues",
            optional: true,
            hidden: true,
          },
        ],
      };

    case "google_drive":
      return {
        description: "Configure Google Drive connector",
        values: [
          {
            type: "list",
            query: "Enter folder paths:",
            label: "Folder Paths",
            name: "folder_paths",
            optional: true,
          },
          {
            type: "checkbox",
            query: "Include shared files?",
            label: "Include Shared",
            name: "include_shared",
            optional: true,
          },
          {
            type: "checkbox",
            query: "Follow shortcuts?",
            label: "Follow Shortcuts",
            name: "follow_shortcuts",
            optional: true,
          },
          {
            type: "checkbox",
            query: "Only include organization public files?",
            label: "Only Org Public",
            name: "only_org_public",
            optional: true,
          },
        ],
      };

    case "gmail":
      return {
        description: "Configure Gmail connector",
        values: [], // No specific configuration needed based on the interface
      };

    case "bookstack":
      return {
        description: "Configure Bookstack connector",
        values: [], // No specific configuration needed based on the interface
      };

    case "confluence":
      return {
        description: "Configure Confluence connector",
        subtext: `Specify any link to a Confluence page below and click "Index" to Index. Based on the provided link, we will index either the entire page and its subpages OR the entire space. For example, entering https://danswer.atlassian.net/wiki/spaces/Engineering/overview and clicking the Index button will index the whole Engineering Confluence space, but entering https://danswer.atlassian.net/wiki/spaces/Engineering/pages/164331/example+page will index that page's children (and optionally, itself). Use the checkbox below to determine whether or not to index the parent page in addition to its children.

We pull the latest pages and comments from each space listed below every 10 minutes`,
        values: [
          {
            type: "text",
            query: "Enter the wiki page URL:",
            label: "Wiki Page URL",
            name: "wiki_page_url",
            optional: false,
            description: "Enter any link to a Confluence space or Page",
          },
          {
            type: "checkbox",
            query: "(For pages) Index the page itself",
            label: "(For pages) Index the page itself",
            name: "index_origin",
            optional: true,
          },
        ],
      };

    case "jira":
      return {
        description: "Configure Jira connector",
        subtext: `Specify any link to a Jira page below and click "Index" to Index. Based on the provided link, we will index the ENTIRE PROJECT, not just the specified page. For example, entering https://danswer.atlassian.net/jira/software/projects/DAN/boards/1 and clicking the Index button will index the whole DAN Jira project.`,
        values: [
          {
            type: "text",
            query: "Enter the Jira project URL:",
            label: "Jira Project URL",
            name: "jira_project_url",
            optional: false,
          },
          {
            type: "list",
            query: "Enter email addresses to blacklist from comments:",
            label: "Comment Email Blacklist",
            name: "comment_email_blacklist",
            description:
              "This is generally useful to ignore certain bots. Add user emails which comments should NOT be indexed.",
            optional: true,
          },
        ],
      };

    case "salesforce":
      return {
        description: "Configure Salesforce connector",
        values: [
          {
            type: "list",
            query: "Enter requested objects:",
            label: "Requested Objects",
            name: "requested_objects",
            optional: true,
            description: `Specify the Salesforce object types you want us to index. If unsure, don't specify any objects and Danswer will default to indexing by 'Account'.

Hint: Use the singular form of the object name (e.g., 'Opportunity' instead of 'Opportunities').`,
          },
        ],
      };

    case "sharepoint":
      return {
        description: "Configure SharePoint connector",
        values: [
          {
            type: "list",
            query: "Enter SharePoint sites:",
            label: "Sites",
            name: "sites",
            optional: true,
            description: `• If no sites are specified, all sites in your organization will be indexed (Sites.Read.All permission required).
• Specifying 'https://danswerai.sharepoint.com/sites/support' for example will only index documents within this site.
• Specifying 'https://danswerai.sharepoint.com/sites/support/subfolder' for example will only index documents within this folder.
`,
          },
        ],
      };

    case "teams":
      return {
        description: "Configure Teams connector",
        values: [
          {
            type: "list",
            query: "Enter Teams to include:",
            label: "Teams",
            name: "teams",
            optional: true,
            description: `Specify 0 or more Teams to index. For example, specifying the Team 'Support' for the 'danswerai' Org will cause us to only index messages sent in channels belonging to the 'Support' Team. If no Teams are specified, all Teams in your organization will be indexed.`,
          },
        ],
      };

    case "discourse":
      return {
        description: "Configure Discourse connector",
        values: [
          {
            type: "text",
            query: "Enter the base URL:",
            label: "Base URL",
            name: "base_url",
            optional: false,
          },
          {
            type: "list",
            query: "Enter categories to include:",
            label: "Categories",
            name: "categories",
            optional: true,
          },
        ],
      };

    case "axero":
      return {
        description: "Configure Axero connector",
        values: [
          {
            type: "list",
            query: "Enter spaces to include:",
            label: "Spaces",
            name: "spaces",
            optional: true,
            description:
              "Specify zero or more Spaces to index (by the Space IDs). If no Space IDs are specified, all Spaces will be indexed.",
          },
        ],
      };

    case "productboard":
      return {
        description: "Configure Productboard connector",
        values: [], // No specific configuration needed based on the interface
      };

    case "slack":
      return {
        description: "Configure Slack connector",
        values: [
          {
            type: "text",
            query: "Enter the Slack workspace:",
            label: "Workspace",
            name: "workspace",
            optional: false,
          },
          {
            type: "list",
            query: "Enter channels to include:",
            label: "Channels",
            name: "channels",
            description: `Specify 0 or more channels to index. For example, specifying the channel "support" will cause us to only index all content within the "#support" channel. If no channels are specified, all channels in your workspace will be indexed.`,
            optional: true,
          },
          {
            type: "checkbox",
            query: "Enable channel regex?",
            label: "Enable Channel Regex",
            name: "channel_regex_enabled",
            description: `If enabled, we will treat the "channels" specified above as regular expressions. A channel's messages will be pulled in by the connector if the name of the channel fully matches any of the specified regular expressions.
For example, specifying .*-support.* as a "channel" will cause the connector to include any channels with "-support" in the name.`,
            optional: true,
          },
        ],
      };

    case "slab":
      return {
        description: "Configure Slab connector",
        values: [
          {
            type: "text",
            query: "Enter the base URL:",
            label: "Base URL",
            name: "base_url",
            optional: false,
            description: `Specify the base URL for your Slab team. This will look something like: https://danswer.slab.com/`,
          },
        ],
      };

    case "guru":
      return {
        description: "Configure Guru connector",
        values: [], // No specific configuration needed based on the interface
      };

    case "gong":
      return {
        description: "Configure Gong connector",
        values: [
          {
            type: "list",
            query: "Enter workspaces to include:",
            label: "Workspaces",
            name: "workspaces",
            optional: true,
            description:
              "Specify 0 or more workspaces to index. Provide the workspace ID or the EXACT workspace name from Gong. If no workspaces are specified, transcripts from all workspaces will be indexed.",
          },
        ],
      };

    case "loopio":
      return {
        description: "Configure Loopio connector",
        values: [
          {
            type: "text",
            query: "Enter the Loopio stack name",
            label: "Loopio Stack Name",
            name: "loopio_stack_name",
            description:
              "Must be exact match to the name in Library Management, leave this blank if you want to index all Stacks",
            optional: true,
          },
        ],
      };

    case "file":
      return {
        description: "Configure File connector",
        values: [
          {
            type: "file",
            query: "Enter file locations:",
            label: "File Locations",
            name: "file_locations",
            optional: false,
          },
        ],
      };

    case "zulip":
      return {
        description: "Configure Zulip connector",
        values: [
          {
            type: "text",
            query: "Enter the realm name",
            label: "Realm Name",
            name: "realm_name",
            optional: false,
          },
          {
            type: "text",
            query: "Enter the realm URL",
            label: "Realm URL",
            name: "realm_url",
            optional: false,
          },
        ],
      };

    case "notion":
      return {
        description: "Configure Notion connector",
        values: [
          {
            type: "text",
            query: "Enter the root page ID",
            label: "Root Page ID",
            name: "root_page_id",
            optional: true,
            description:
              "If specified, will only index the specified page + all of its child pages. If left blank, will index all pages the integration has been given access to.",
          },
        ],
      };

    case "requesttracker":
      return {
        description: "Configure HubSpot connector",
        values: [], // No specific configuration needed based on the interface
      };

    case "hubspot":
      return {
        description: "Configure HubSpot connector",
        values: [], // No specific configuration needed based on the interface
      };

    case "document360":
      return {
        description: "Configure Document360 connector",
        values: [
          {
            type: "text",
            query: "Enter the workspace",
            label: "Workspace",
            name: "workspace",
            optional: false,
          },
          {
            type: "list",
            query: "Enter categories to include",
            label: "Categories",
            name: "categories",
            optional: true,
            description:
              "Specify 0 or more categories to index. For instance, specifying the category 'Help' will cause us to only index all content within the 'Help' category. If no categories are specified, all categories in your workspace will be indexed.",
          },
        ],
      };

    case "clickup":
      return {
        description: "Configure ClickUp connector",
        values: [
          {
            type: "select",
            query: "Select the connector type:",
            label: "Connector Type",
            name: "connector_type",
            optional: false,
            options: [
              { name: "list", value: "list" },
              { name: "folder", value: "folder" },
              { name: "space", value: "space" },
              { name: "workspace", value: "workspace" },
            ],
          },
          {
            type: "list",
            query: "Enter connector IDs:",
            label: "Connector IDs",
            name: "connector_ids",
            description: "Specify 0 or more id(s) to index from.",
            optional: true,
          },
          {
            type: "checkbox",
            query: "Retrieve task comments?",
            label: "Retrieve Task Comments",
            name: "retrieve_task_comments",
            description:
              "If checked, then all the comments for each task will also be retrieved and indexed.",
            optional: false,
          },
        ],
      };

    case "google_sites":
      return {
        description: "Configure Google Sites connector",
        values: [
          {
            type: "zip",
            query: "Enter the zip path:",
            label: "Zip Path",
            name: "zip_path",
            optional: false,
            description:
              "Upload a zip file containing the HTML of your Google Site",
          },
          {
            type: "text",
            query: "Enter the base URL:",
            label: "Base URL",
            name: "base_url",
            optional: false,
          },
        ],
      };

    case "zendesk":
      return {
        description: "Configure Zendesk connector",
        values: [], // No specific configuration needed based on the interface
      };
    case "linear":
      return {
        description: "Configure Dropbox connector",
        values: [], // No specific configuration needed based on the interface
      };
    case "dropbox":
      return {
        description: "Configure Dropbox connector",
        values: [], // No specific configuration needed based on the interface
      };

    case "s3":
      return {
        description: "Configure S3 connector",
        values: [
          {
            type: "text",
            query: "Enter the bucket name:",
            label: "Bucket Name",
            name: "bucket_name",
            optional: false,
          },
          {
            type: "text",
            query: "Enter the prefix:",
            label: "Prefix",
            name: "prefix",
            optional: true,
          },
          {
            type: "text",
            label: "Bucket Type",
            name: "bucket_type",
            optional: false,
            default: "s3",
            hidden: true,
          },
        ],
      };

    case "r2":
      return {
        description: "Configure R2 connector",
        values: [
          {
            type: "text",
            query: "Enter the bucket name:",
            label: "Bucket Name",
            name: "bucket_name",
            optional: false,
          },
          {
            type: "text",
            query: "Enter the prefix:",
            label: "Prefix",
            name: "prefix",
            optional: true,
          },
          {
            type: "text",
            label: "Bucket Type",
            name: "bucket_type",
            optional: false,
            default: "r2",
            hidden: true,
          },
        ],
      };
    case "google_cloud_storage":
      return {
        description: "Configure Google Cloud Storage connector",
        values: [
          {
            type: "text",
            query: "Enter the bucket name:",
            label: "Bucket Name",
            name: "bucket_name",
            optional: false,
            description: "Name of the GCS bucket to index, e.g. my-gcs-bucket",
          },
          {
            type: "text",
            query: "Enter the prefix:",
            label: "Path Prefix",
            name: "prefix",
            optional: true,
          },
          {
            type: "text",
            label: "Bucket Type",
            name: "bucket_type",
            optional: false,
            default: "google_cloud_storage",
            hidden: true,
          },
        ],
      };

    case "oci_storage":
      return {
        description: "Configure OCI Storage connector",
        values: [
          {
            type: "text",
            query: "Enter the bucket name:",
            label: "Bucket Name",
            name: "bucket_name",
            optional: false,
          },
          {
            type: "text",
            query: "Enter the prefix:",
            label: "Prefix",
            name: "prefix",
            optional: true,
          },
          {
            type: "text",
            label: "Bucket Type",
            name: "bucket_type",
            optional: false,
            default: "oci_storage",
            hidden: true,
          },
        ],
      };

    case "wikipedia":
      return {
        description: "Configure Wikipedia connector",
        values: [
          {
            type: "text",
            query: "Enter the language code:",
            label: "Language Code",
            name: "language_code",
            optional: false,
            description:
              "Input a valid Wikipedia language code (e.g. 'en', 'es')",
          },
          // {
          //   type: "text",
          //   query: "Enter the Wikipedia Site URL",
          //   label: "Wikipedia Site URL",
          //   name: "hostname",
          //   optional: false,
          // },
          {
            type: "list",
            query: "Enter categories to include:",
            label: "Categories to index",
            name: "categories",
            description:
              "Specify 0 or more names of categories to index. For most Wikipedia sites, these are pages with a name of the form 'Category: XYZ', that are lists of other pages/categories. Only specify the name of the category, not its url.",
            optional: true,
          },
          {
            type: "list",
            query: "Enter pages to include:",
            label: "Pages",
            name: "pages",
            optional: true,
            description: "Specify 0 or more names of pages to index.",
          },
          {
            type: "number",
            query: "Enter the recursion depth:",
            label: "Recursion Depth",
            name: "recurse_depth",
            description:
              "When indexing categories that have sub-categories, this will determine how may levels to index. Specify 0 to only index the category itself (i.e. no recursion). Specify -1 for unlimited recursion depth. Note, that in some rare instances, a category might contain itself in its dependencies, which will cause an infinite loop. Only use -1 if you confident that this will not happen.",
            optional: false,
          },
        ],
      };

    case "mediawiki":
      return {
        description: "Configure MediaWiki connector",
        values: [
          {
            type: "text",
            query: "Enter the language code:",
            label: "Language Code",
            name: "language_code",
            optional: false,
            description:
              "Input a valid MediaWiki language code (e.g. 'en', 'es')",
          },
          {
            type: "text",
            query: "Enter the MediaWiki Site URL",
            label: "MediaWiki Site URL",
            name: "hostname",
            optional: false,
          },
          {
            type: "list",
            query: "Enter categories to include:",
            label: "Categories to index",
            name: "categories",
            description:
              "Specify 0 or more names of categories to index. For most MediaWiki sites, these are pages with a name of the form 'Category: XYZ', that are lists of other pages/categories. Only specify the name of the category, not its url.",
            optional: true,
          },
          {
            type: "list",
            query: "Enter pages to include:",
            label: "Pages",
            name: "pages",
            optional: true,
            description:
              "Specify 0 or more names of pages to index. Only specify the name of the page, not its url.",
          },
          {
            type: "number",
            query: "Enter the recursion depth:",
            label: "Recursion Depth",
            name: "recurse_depth",
            description:
              "When indexing categories that have sub-categories, this will determine how may levels to index. Specify 0 to only index the category itself (i.e. no recursion). Specify -1 for unlimited recursion depth. Note, that in some rare instances, a category might contain itself in its dependencies, which will cause an infinite loop. Only use -1 if you confident that this will not happen.",
            optional: true,
          },
        ],
      };
  }
  return {} as any;
};

export const sourcesWithoutCredentials: ValidSources[] = [
  "file",
  "google_sites",
  "wikipedia",
  "mediawiki",
];

//  Poll sources
// // All but below

// load_state: web
