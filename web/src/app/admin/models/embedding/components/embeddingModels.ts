import { CohereIcon, GoogleIcon, IconProps, OpenAIIcon, VoyageIcon } from "@/components/icons/icons";

export type ProviderId = "openai" | "cohere" | "voyage" | "google";

export interface CloudEmbeddingModel {
  name: string;
  description: string;
  is_configured: boolean;
  model_dim: number;
  normalize: boolean;
  link: string;
  query_prefix: string;
  passage_prefix: string;
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
  model_name?: string;
}

export interface CloudEmbeddingProvider {
  id: ProviderId;
  name: string;
  website: string;
  icon: ({ size, className }: IconProps) => JSX.Element;
  description: string;
  configured: boolean;
  apiLink: string;
  costslink?: string;
  api_key?: string;
  api_base?: string;
  api_version?: string;
  custom_config?: Record<string, string>;
  default_model_name: string;
  models: CloudEmbeddingModel[];
  is_configured: boolean;
  is_default_provider?: boolean;
}

export interface EmbeddingModelResponse {
  model_name?: string | null;
}

export interface FullEmbeddingModelResponse {
  current_model_name: string;
  secondary_model_name: string | null;
}

export interface EmbeddingModelDescriptor {
  model_name: string;
  model_dim: number;
  normalize: boolean;
  query_prefix?: string;
  passage_prefix?: string;
}

export interface FullEmbeddingModelDescriptor extends EmbeddingModelDescriptor {
  description: string;
  isDefault?: boolean;
  link?: string;
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

export const AVAILABLE_CLOUD_MODELS: CloudEmbeddingProvider[] = [
  {
    id: "openai",
    name: "OpenAI",
    website: "https://openai.com",
    icon: OpenAIIcon,
    description: "Leading AI research company known for GPT models and DALL-E.",
    configured: true,
    apiLink: "https://platform.openai.com/api-keys",
    default_model_name: "text-embedding-3-small",
    models: [
      {
        name: "text-embedding-3-small",
        description: "OpenAI's newer, more efficient embedding model. Good balance of performance and cost.",
        is_configured: true,
        model_dim: 1536,
        normalize: true,
        link: "https://platform.openai.com/docs/guides/embeddings",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.02,
        enabled: true,
        mtebScore: 62.3,
        maxContext: 8191,
        latency1k: 0.42,
        similarityMetric: "Cosine Similarity"
      },
      {
        name: "text-embedding-3-large",
        description: "OpenAI's large embedding model. Best performance, but more expensive.",
        is_configured: true,
        model_dim: 3072,
        normalize: true,
        link: "https://platform.openai.com/docs/guides/embeddings",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.13,
        mtebScore: 64.6,
        maxContext: 8191,
        latency1k: 0.63,
        similarityMetric: "Cosine Similarity"
      }
    ],
    is_configured: true,
    costslink: "https://openai.com/pricing",
  },
  {
    id: "cohere",
    name: "Cohere",
    website: "https://cohere.ai",
    icon: CohereIcon,
    description: "Specializes in NLP models for various text-based tasks.",
    configured: true,
    apiLink: "https://dashboard.cohere.ai/api-keys",
    default_model_name: "embed-english-v3.0",
    models: [
      {
        name: "embed-english-v3.0",
        description: "Cohere's English embedding model. Good performance for English-language tasks.",
        is_configured: true,
        model_dim: 1024,
        normalize: true,
        link: "https://docs.cohere.com/docs/cohere-embed",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.1,
        mtebScore: 64.5,
        maxContext: 512,
        latency1k: 0.30,
        latency8k: 0.54,
        similarityMetric: "Cosine Similarity"
      },
      {
        name: "embed-english-light-v3.0",
        description: "Cohere's lightweight English embedding model. Faster and more efficient for simpler tasks.",
        is_configured: true,
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
        similarityMetric: "Cosine Similarity"
      }
    ],
    is_configured: true,
    costslink: "https://cohere.com/pricing",
  },
  {
    id: "voyage",
    name: "Voyage AI",
    website: "https://www.voyageai.com",
    icon: VoyageIcon,
    description: "Focuses on advanced language models and embeddings.",
    configured: true,
    apiLink: "https://www.voyageai.com/dashboard",
    default_model_name: "voyage-large-2-instruct",
    models: [
      {
        name: "voyage-large-2-instruct",
        description: "Voyage AI's large embedding model. High performance with instruction fine-tuning.",
        is_configured: true,
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
        memoryUsage: "4.54GB"
      },
      {
        name: "voyage-light-2-instruct",
        description: "Voyage AI's lightweight embedding model. Good balance of performance and efficiency.",
        is_configured: true,
        model_dim: 1024,
        normalize: true,
        link: "https://docs.voyageai.com/docs/embeddings",
        query_prefix: "",
        passage_prefix: "",
        pricePerMillion: 0.12,
        mtebScore: 67.13,
        maxContext: 16000,
        latency1k: 1.07,
        similarityMetric: "Cosine Similarity"
      }
    ],
    is_configured: true,
    costslink: "https://www.voyageai.com/pricing",
  },
  {
    id: "google",
    name: "Google AI",
    website: "https://ai.google",
    icon: GoogleIcon,
    description: "Offers a wide range of AI services including language and vision models.",
    configured: false,
    apiLink: "https://console.cloud.google.com/apis/credentials",
    default_model_name: "gecko",
    models: [
      {
        name: "gecko",
        description: "Google's Gecko embedding model. Powerful and efficient, but requires more setup.",
        is_configured: false,
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
        notes: "Price is per character, not token. Longer setup time, need to configure Google Cloud Console with project ID, etc."
      }
    ],
    is_configured: false,
    costslink: "https://cloud.google.com/vertex-ai/pricing",
  },
];

export const INVALID_OLD_MODEL = "thenlper/gte-small";

export function checkModelNameIsValid(modelName: string | undefined | null): boolean {
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
