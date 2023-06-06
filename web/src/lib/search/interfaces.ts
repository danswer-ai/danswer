import { SearchType } from "@/components/search/SearchTypeSelector";
import { ValidSources } from "../types";

export interface Quote {
  document_id: string;
  link: string;
  source_type: ValidSources;
  blurb: string;
  semantic_identifier: string | null;
}

export interface DanswerDocument {
  document_id: string;
  link: string;
  source_type: ValidSources;
  blurb: string;
  semantic_identifier: string | null;
}

export interface SearchResponse {
  searchType: SearchType;
  answer: string | null;
  quotes: Record<string, Quote> | null;
  documents: DanswerDocument[] | null;
}

export interface Source {
  displayName: string;
  internalName: ValidSources;
}

export interface SearchRequestArgs {
  query: string;
  sources: Source[];
  updateCurrentAnswer: (val: string) => void;
  updateQuotes: (quotes: Record<string, Quote>) => void;
  updateDocs: (documents: DanswerDocument[]) => void;
  searchType: SearchType;
}
