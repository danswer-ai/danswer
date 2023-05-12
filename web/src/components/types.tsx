export interface Quote {
  document_id: string;
  link: string;
  source_type: string;
  blurb: string;
  semantic_identifier: string | null;
}

export interface SearchResponse {
  answer: string;
  quotes: Record<string, Quote>;
}
