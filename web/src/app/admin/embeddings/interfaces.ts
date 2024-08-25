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
  model_name: string;
  model_dim: number;
  normalize: boolean;
  query_prefix: string;
  passage_prefix: string;
  index_name: string;
  multipass_indexing: boolean;
  multilingual_expansion: string[];
  disable_rerank_for_streaming: boolean;
}

export interface SavedSearchSettings extends RerankingDetails {
  model_name: string;
  model_dim: number;
  normalize: boolean;
  query_prefix: string;
  passage_prefix: string;
  index_name: string;
  multipass_indexing: boolean;
  multilingual_expansion: string[];
  disable_rerank_for_streaming: boolean;
}

export interface RerankingModel {
  provider?: RerankerProvider;
  modelName: string;
  displayName: string;
  description: string;
  link: string;
  cloud: boolean;
}

export const rerankingModels: RerankingModel[] = [
  {
    cloud: false,
    modelName: "mixedbread-ai/mxbai-rerank-xsmall-v1",
    displayName: "MixedBread XSmall",
    description: "Fastest, smallest model for basic reranking tasks.",
    link: "https://huggingface.co/mixedbread-ai/mxbai-rerank-xsmall-v1",
  },
  {
    cloud: false,
    modelName: "mixedbread-ai/mxbai-rerank-base-v1",
    displayName: "MixedBread Base",
    description: "Balanced performance for general reranking needs.",
    link: "https://huggingface.co/mixedbread-ai/mxbai-rerank-base-v1",
  },
  {
    cloud: false,
    modelName: "mixedbread-ai/mxbai-rerank-large-v1",
    displayName: "MixedBread Large",
    description: "Most powerful model for complex reranking tasks.",
    link: "https://huggingface.co/mixedbread-ai/mxbai-rerank-large-v1",
  },
  {
    cloud: true,
    provider: RerankerProvider.COHERE,
    modelName: "rerank-english-v3.0",
    displayName: "Cohere English",
    description: "High-performance English-focused reranking model.",
    link: "https://docs.cohere.com/docs/rerank",
  },
  {
    cloud: true,
    provider: RerankerProvider.COHERE,
    modelName: "rerank-multilingual-v3.0",
    displayName: "Cohere Multilingual",
    description: "Powerful multilingual reranking model.",
    link: "https://docs.cohere.com/docs/rerank",
  },
];
