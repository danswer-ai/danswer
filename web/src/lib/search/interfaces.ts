import { ValidSources } from "../types";

export const FlowType = {
  SEARCH: "search",
  QUESTION_ANSWER: "question-answer",
};
export type FlowType = (typeof FlowType)[keyof typeof FlowType];
export const SearchType = {
  SEMANTIC: "semantic",
  KEYWORD: "keyword",
  AUTOMATIC: "automatic",
};
export type SearchType = (typeof SearchType)[keyof typeof SearchType];

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
  suggestedSearchType: SearchType | null;
  suggestedFlowType: FlowType | null;
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
  updateSuggestedSearchType: (searchType: SearchType) => void;
  updateSuggestedFlowType: (flowType: FlowType) => void;
  selectedSearchType: SearchType | null;
}
