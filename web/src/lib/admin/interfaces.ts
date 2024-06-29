import { ToolSnapshot } from "@/lib/tools/interfaces";
import { DocumentSet, MinimalUserSnapshot } from "@/lib/types";

export interface StarterMessage {
  name: string;
  description: string | null;
  message: string;
}

export interface Prompt {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  include_citations: boolean;
  datetime_aware: boolean;
  default_prompt: boolean;
}

export interface Persona {
  id: number;
  name: string;
  owner: MinimalUserSnapshot | null;
  is_visible: boolean;
  is_public: boolean;
  display_priority: number | null;
  description: string;
  document_sets: DocumentSet[];
  prompts: Prompt[];
  tools: ToolSnapshot[];
  num_chunks?: number;
  llm_relevance_filter?: boolean;
  llm_filter_extraction?: boolean;
  llm_model_provider_override?: string;
  llm_model_version_override?: string;
  starter_messages: StarterMessage[] | null;
  default_persona: boolean;
  users: string[];
  groups: number[];
}

export interface PersonaCreationRequest {
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  include_citations: boolean;
  is_public: boolean;
  llm_relevance_filter: boolean | null;
  llm_model_provider_override: string | null;
  llm_model_version_override: string | null;
  starter_messages: StarterMessage[] | null;
  users?: string[];
  groups: number[];
  tool_ids: number[]; // Added tool_ids to the interface
}

export interface PersonaUpdateRequest {
  id: number;
  existingPromptId: number | undefined;
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_set_ids: number[];
  num_chunks: number | null;
  include_citations: boolean;
  is_public: boolean;
  llm_relevance_filter: boolean | null;
  llm_model_provider_override: string | null;
  llm_model_version_override: string | null;
  starter_messages: StarterMessage[] | null;
  users?: string[];
  groups: number[];
  tool_ids: number[]; 
}