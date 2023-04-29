export interface Quote {
  document_id: string;
  link: string;
  source_type: string;
}

export interface SearchResponse {
  answer: string;
  quotes: Record<string, Quote>;
}
