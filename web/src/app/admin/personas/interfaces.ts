import { DocumentSet } from "@/lib/types";

export interface Persona {
  id: number;
  name: string;
  description: string;
  system_prompt: string;
  task_prompt: string;
  document_sets: DocumentSet[];
}
