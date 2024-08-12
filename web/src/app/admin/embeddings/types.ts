export interface RerankingDetails {
  rerank_model_name: string | null;
  provider_type: RerankerProvider | null;
  api_key: string | null;
  num_rerank: number;
}

export enum RerankerProvider {
  COHERE = "cohere",
}
export interface AdvancedDetails {
  multilingual_expansion: string[];
  multipass_indexing: boolean;
  disable_rerank_for_streaming: boolean;
}

export interface SavedSearchSettings extends RerankingDetails {
  multilingual_expansion: string[];
  multipass_indexing: boolean;
  disable_rerank_for_streaming: boolean;
}
