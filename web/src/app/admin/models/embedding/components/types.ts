import {
  CohereIcon,
  GoogleIcon,
  IconProps,
  OpenAIIcon,
  VoyageIcon,
} from "@/components/icons/icons";

export type ProviderId = "openai" | "cohere" | "voyage" | "google";

export interface CloudEmbeddingProvider {
  id: number;
  name: string;
  api_key?: string;
  custom_config?: Record<string, string>;
  default_model_id?: number;

  // Frontend-specific properties
  website: string;
  icon: ({ size, className }: IconProps) => JSX.Element;
  description: string;
  apiLink: string;
  costslink?: string;

  // Relationships
  embedding_models: CloudEmbeddingModel[];
  default_model?: CloudEmbeddingModel;
}

export interface EmbeddingModelResponse {
  model_name?: string | null;
}

export interface FullEmbeddingModelResponse {
  current_model_name: string;
  secondary_model_name: string | null;
}

export interface EmbeddingModelDescriptor {
  model_name?: string;
  model_dim?: number;
  normalize?: boolean;
  query_prefix?: string;
  passage_prefix?: string;
}

export interface CloudEmbeddingModel extends EmbeddingModelDescriptor {
  name: string;
  description: string;
  cloud_provider_id?: number | null;
  link: string;
  pricePerMillion: number;
  enabled?: boolean;
  mtebScore: number;
  maxContext: number;
  latency1k?: number;
  latency8k?: number;
  similarityMetric?: string;
  numParameters?: string;
  memoryUsage?: string;
  notes?: string;
}

export interface EnrichedCloudEmbeddingModel
  extends CloudEmbeddingModel,
    EmbeddingModelDescriptor {
  model_name?: string;
  cloud_provider_id: number | null;
}

export interface FullEmbeddingModelDescriptor extends EmbeddingModelDescriptor {
  description: string;
  isDefault?: boolean;
  link?: string;
  cloud_provider_id?: number;
}

export const AVAILABLE_MODELS: FullEmbeddingModelDescriptor[] = [
  {
    model_name: "intfloat/e5-base-v2",
    model_dim: 768,
    normalize: true,
    description:
      "The recommended default for most situations. If you aren't sure which model to use, this is probably the one.",
    isDefault: true,
    link: "https://huggingface.co/intfloat/e5-base-v2",
    query_prefix: "query: ",
    passage_prefix: "passage: ",
  },
  {
    model_name: "intfloat/e5-small-v2",
    model_dim: 384,
    normalize: true,
    description:
      "A smaller / faster version of the default model. If you're running Danswer on a resource constrained system, then this is a good choice.",
    link: "https://huggingface.co/intfloat/e5-small-v2",
    query_prefix: "query: ",
    passage_prefix: "passage: ",
  },
  {
    model_name: "intfloat/multilingual-e5-base",
    model_dim: 768,
    normalize: true,
    description:
      "If you have many documents in other languages besides English, this is the one to go for.",
    link: "https://huggingface.co/intfloat/multilingual-e5-base",
    query_prefix: "query: ",
    passage_prefix: "passage: ",
  },
  {
    model_name: "intfloat/multilingual-e5-small",
    model_dim: 384,
    normalize: true,
    description:
      "If you have many documents in other languages besides English, and you're running on a resource constrained system, then this is the one to go for.",
    link: "https://huggingface.co/intfloat/multilingual-e5-base",
    query_prefix: "query: ",
    passage_prefix: "passage: ",
  },
];

export interface CloudEmbeddingProviderFull extends CloudEmbeddingProvider {
  configured: boolean;
}

export const AVAILABLE_CLOUD_MODELS: CloudEmbeddingProvider[] = [
  {
    id: 0,
    name: "OpenAI",
    website: "https://openai.com",
    icon: OpenAIIcon,
    description: "Leading AI research company known for GPT models and DALL-E.",
    apiLink: "https://platform.openai.com/api-keys",
    costslink: "https://openai.com/pricing",
    embedding_models: [
      {
        name: "text-embedding-3-small",
        description:
          "OpenAI's newer, more efficient embedding model. Good balance of performance and cost.",
        model_dim: 1536,
        normalize: true,
        link: "https://platform.openai.com/docs/guides/embeddings",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.02,
        enabled: false,
        mtebScore: 62.3,
        maxContext: 8191,
        latency1k: 0.42,
        similarityMetric: "Cosine Similarity",
      },
      {
        name: "text-embedding-3-large",
        description:
          "OpenAI's large embedding model. Best performance, but more expensive.",

        model_dim: 3072,
        normalize: true,
        link: "https://platform.openai.com/docs/guides/embeddings",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.13,
        mtebScore: 64.6,
        maxContext: 8191,
        latency1k: 0.63,
        similarityMetric: "Cosine Similarity",
        enabled: false,
      },
    ],
    default_model_id: 0, // Assuming the first model is the default
  },
  {
    id: 1,
    name: "Cohere",
    website: "https://cohere.ai",
    icon: CohereIcon,
    description: "Specializes in NLP models for various text-based tasks.",
    apiLink: "https://dashboard.cohere.ai/api-keys",
    costslink: "https://cohere.com/pricing",
    embedding_models: [
      {
        name: "embed-english-v3.0",
        description:
          "Cohere's English embedding model. Good performance for English-language tasks.",

        model_dim: 1024,
        normalize: true,
        link: "https://docs.cohere.com/docs/cohere-embed",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.1,
        mtebScore: 64.5,
        maxContext: 512,
        latency1k: 0.3,
        latency8k: 0.54,
        similarityMetric: "Cosine Similarity",
        enabled: false,
      },
      {
        name: "embed-english-light-v3.0",
        description:
          "Cohere's lightweight English embedding model. Faster and more efficient for simpler tasks.",

        model_dim: 384,
        normalize: true,
        link: "https://docs.cohere.com/docs/cohere-embed",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.1,
        mtebScore: 62,
        maxContext: 512,
        latency1k: 0.26,
        latency8k: 0.51,
        similarityMetric: "Cosine Similarity",
        enabled: false,
      },
    ],
    default_model_id: 0, // Assuming the first model is the default
  },
  {
    id: 2,
    name: "Voyage AI",
    website: "https://www.voyageai.com",
    icon: VoyageIcon,
    description: "Focuses on advanced language models and embeddings.",
    apiLink: "https://www.voyageai.com/dashboard",
    costslink: "https://www.voyageai.com/pricing",
    embedding_models: [
      {
        name: "voyage-large-2-instruct",
        description:
          "Voyage AI's large embedding model. High performance with instruction fine-tuning.",

        model_dim: 1024,
        normalize: true,
        link: "https://docs.voyageai.com/docs/embeddings",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.12,
        mtebScore: 68.28,
        maxContext: 4000,
        latency1k: 1.04,
        similarityMetric: "Cosine Similarity",
        numParameters: "1.22B",
        memoryUsage: "4.54GB",
        enabled: false,
      },
      {
        name: "voyage-light-2-instruct",
        description:
          "Voyage AI's lightweight embedding model. Good balance of performance and efficiency.",

        model_dim: 1024,
        normalize: true,
        link: "https://docs.voyageai.com/docs/embeddings",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.12,
        mtebScore: 67.13,
        maxContext: 16000,
        latency1k: 1.07,
        similarityMetric: "Cosine Similarity",
        enabled: false,
      },
    ],
    default_model_id: 0, // Assuming the first model is the default
  },
  {
    id: 3,
    name: "Google AI",
    website: "https://ai.google",
    icon: GoogleIcon,
    description:
      "Offers a wide range of AI services including language and vision models.",
    apiLink: "https://console.cloud.google.com/apis/credentials",
    costslink: "https://cloud.google.com/vertex-ai/pricing",
    embedding_models: [
      {
        name: "gecko",
        description:
          "Google's Gecko embedding model. Powerful and efficient, but requires more setup.",
        model_dim: 768,
        normalize: true,
        link: "https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.025,
        mtebScore: 66.31,
        maxContext: 2048,
        similarityMetric: "Cosine Similarity",
        numParameters: "1.2B",
        memoryUsage: "4.4GB",
        notes:
          "Price is per character, not token. Longer setup time, need to configure Google Cloud Console with project ID, etc.",
        enabled: false,
      },
    ],
    default_model_id: 0, // Assuming the first model is the default
  },
];

export const INVALID_OLD_MODEL = "thenlper/gte-small";

export function checkModelNameIsValid(
  modelName: string | undefined | null
): boolean {
  return !!modelName && modelName !== INVALID_OLD_MODEL;
}

export function fillOutEmeddingModelDescriptor(
  embeddingModel: EmbeddingModelDescriptor | FullEmbeddingModelDescriptor
): FullEmbeddingModelDescriptor {
  return {
    ...embeddingModel,
    description: "",
  };
}
