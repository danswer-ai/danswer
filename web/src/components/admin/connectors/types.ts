import { ValidSources } from "@/lib/types";

export interface SlackConfig {
  slack_bot_token: string;
  workspace_id: string;
  pull_frequency: number;
}
