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

export interface AnswerPiece {
  answer_piece: string;
}

export interface Quote {
  quote: string;
  document_id: string;
  link: string | null;
  source_type: ValidSources;
  blurb: string;
  semantic_identifier: string;
}

export interface DanswerDocument {
  document_id: string;
  link: string;
  source_type: ValidSources;
  blurb: string;
  semantic_identifier: string | null;
  boost: number;
  score: number;
  match_highlights: string[];
}

export interface SearchResponse {
  suggestedSearchType: SearchType | null;
  suggestedFlowType: FlowType | null;
  answer: string | null;
  quotes: Quote[] | null;
  documents: DanswerDocument[] | null;
  error: string | null;
  queryEventId: number | null;
}

export interface Source {
  displayName: string;
  internalName: ValidSources;
}

export interface SearchDefaultOverrides {
  forceDisplayQA: boolean;
  offset: number;
}

export interface SearchRequestArgs {
  query: string;
  sources: Source[];
  documentSets: string[];
  updateCurrentAnswer: (val: string) => void;
  updateQuotes: (quotes: Quote[]) => void;
  updateDocs: (documents: DanswerDocument[]) => void;
  updateSuggestedSearchType: (searchType: SearchType) => void;
  updateSuggestedFlowType: (flowType: FlowType) => void;
  updateError: (error: string) => void;
  updateQueryEventId: (queryEventID: number) => void;
  selectedSearchType: SearchType | null;
  offset: number | null;
}

export interface SearchRequestOverrides {
  searchType?: SearchType;
  offset?: number;
}

export interface ValidQuestionResponse {
  answerable: boolean | null;
  reasoning: string | null;
}
