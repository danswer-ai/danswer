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

export interface AbridgedSearchDoc {
  document_id: string;
  semantic_identifier: string;
  link: string | null;
}

export interface QuerySnapshot {
  id: number;
  query: string;
  llm_answer: string;
  retrieved_documents: AbridgedSearchDoc[];
  time_created: string;
  feedback: Feedback | null;
}
