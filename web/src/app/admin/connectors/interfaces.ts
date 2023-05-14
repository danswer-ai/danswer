export interface SlackConfig {
  slack_bot_token: string;
  workspace_id: string;
  pull_frequency: number;
}

export interface IndexAttempt {
  connector_specific_config: { [key: string]: any };
  status: "success" | "failure" | "in_progress" | "not_started";
  time_created: string;
  time_updated: string;
  docs_indexed: number;
}

export interface ListIndexingResponse {
  index_attempts: IndexAttempt[];
}
