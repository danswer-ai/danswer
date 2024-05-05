import { Feedback } from "@/lib/types";

export interface QueryAnalytics {
  total_queries: number;
  total_likes: number;
  total_dislikes: number;
  date: string;
}

export interface UserAnalytics {
  total_active_users: number;
  date: string;
}

export interface DanswerBotAnalytics {
  total_queries: number;
  auto_resolved: number;
  date: string;
}

export interface AbridgedSearchDoc {
  document_id: string;
  semantic_identifier: string;
  link: string | null;
}

export interface MessageSnapshot {
  message: string;
  message_type: "user" | "assistant";
  documents: AbridgedSearchDoc[];
  feedback_type: Feedback | null;
  feedback_text: string | null;
  time_created: string;
}

export interface ChatSessionSnapshot {
  id: number;
  user_email: string | null;
  name: string | null;
  messages: MessageSnapshot[];
  persona_name: string | null;
  time_created: string;
}
