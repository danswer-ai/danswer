import { DateRangePickerValue } from "@tremor/react";
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

export interface AnswerPiecePacket {
  answer_piece: string;
}

export interface ErrorMessagePacket {
  error: string;
}

export interface Quote {
  quote: string;
  document_id: string;
  link: string | null;
  source_type: ValidSources;
  blurb: string;
  semantic_identifier: string;
}

export interface QuotesInfoPacket {
  quotes: Quote[];
}

export interface DanswerDocument {
  document_id: string;
  link: string;
  source_type: ValidSources;
  blurb: string;
  semantic_identifier: string | null;
  boost: number;
  hidden: boolean;
  score: number;
  match_highlights: string[];
  updated_at: string | null;
}

export interface DocumentInfoPacket {
  top_documents: DanswerDocument[];
  predicted_flow: FlowType | null;
  predicted_search: SearchType | null;
  time_cutoff: string | null;
  favor_recent: boolean;
}

export interface LLMRelevanceFilterPacket {
  relevant_chunk_indices: number[];
}

export interface QueryEventIdPacket {
  query_event_id: number;
}

export interface SearchResponse {
  suggestedSearchType: SearchType | null;
  suggestedFlowType: FlowType | null;
  answer: string | null;
  quotes: Quote[] | null;
  documents: DanswerDocument[] | null;
  selectedDocIndices: number[] | null;
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

export interface Filters {
  source_type: string[] | null;
  document_set: string[] | null;
  time_cutoff: Date | null;
}

export interface SearchRequestArgs {
  query: string;
  chatSessionId: number;
  sources: Source[];
  documentSets: string[];
  timeRange: DateRangePickerValue | null;
  updateCurrentAnswer: (val: string) => void;
  updateQuotes: (quotes: Quote[]) => void;
  updateDocs: (documents: DanswerDocument[]) => void;
  updateSelectedDocIndices: (docIndices: number[]) => void;
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
  error: string | null;
}
