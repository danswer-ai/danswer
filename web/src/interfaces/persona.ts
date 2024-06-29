import { ToolSnapshot } from "@/lib/tools/interfaces";
import { DocumentSet, MinimalUserSnapshot } from "@/lib/types";
import { Prompt, StarterMessage } from "./admin/interfaces";

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