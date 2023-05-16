import { ValidSources } from "@/lib/types";

export interface Quote {
  document_id: string;
  link: string;
  source_type: ValidSources;
  blurb: string;
  semantic_identifier: string | null;
}

export interface Document {
  document_id: string;
  link: string;
  source_type: ValidSources;
  blurb: string;
  semantic_identifier: string | null;
}

export interface SearchResponse {
  answer: string;
  quotes: Record<string, Quote>;
}
