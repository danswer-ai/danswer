import {
  CohereIcon,
  GoogleIcon,
  IconProps,
  OpenAIIcon,
  VoyageIcon,
} from "@/components/icons/icons";

export type ProviderId = "openai" | "cohere" | "voyage" | "vertex";

export interface CloudEmbeddingProvider {
  id: number;
  name: string;
  api_key?: string;
  custom_config?: Record<string, string>;
  docsLink?: string;

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
  cloud_provider_name: string | null;
  pricePerMillion: number;
  enabled?: boolean;
  mtebScore: number;
  maxContext: number;
  notes?: string;
}

export interface EnrichedCloudEmbeddingModel
  extends CloudEmbeddingModel,
    EmbeddingModelDescriptor {
  model_name?: string;
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

export interface CloudEmbeddingProviderFull extends CloudEmbeddingProvider {
  configured: boolean;
}

export const AVAILABLE_CLOUD_PROVIDERS: CloudEmbeddingProvider[] = [
  {
    id: 0,
    name: "OpenAI",
    website: "https://openai.com",
    icon: OpenAIIcon,
    description: "Leading AI research company known for GPT models and DALL-E.",
    apiLink: "https://platform.openai.com/api-keys",
    docsLink:
      "https://docs.danswer.dev/guides/embedding_providers#openai-models",
    costslink: "https://openai.com/pricing",
    embedding_models: [
      {
        name: "text-embedding-3-small",
        cloud_provider_name: "OpenAI",
        description:
          "OpenAI's newer, more efficient embedding model. Good balance of performance and cost.",
        model_dim: 1536,
        normalize: true,
        pricePerMillion: 0.02,
        enabled: false,
        mtebScore: 62.3,
        maxContext: 8191,
      },
      {
        name: "text-embedding-3-large",
        cloud_provider_name: "OpenAI",
        description:
          "OpenAI's large embedding model. Best performance, but more expensive.",
        model_dim: 3072,
        normalize: true,
        pricePerMillion: 0.13,
        mtebScore: 64.6,
        maxContext: 8191,
        enabled: false,
      },
    ],
  },
  {
    id: 1,
    name: "Cohere",
    website: "https://cohere.ai",
    icon: CohereIcon,
    docsLink:
      "https://docs.danswer.dev/guides/embedding_providers#cohere-models",
    description: "Specializes in NLP models for various text-based tasks.",
    apiLink: "https://dashboard.cohere.ai/api-keys",
    costslink: "https://cohere.com/pricing",
    embedding_models: [
      {
        name: "embed-english-v3.0",
        cloud_provider_name: "Cohere",
        description:
          "Cohere's English embedding model. Good performance for English-language tasks.",
        model_dim: 1024,
        pricePerMillion: 0.1,
        mtebScore: 64.5,
        maxContext: 512,
        enabled: false,
      },
      {
        name: "embed-english-light-v3.0",
        cloud_provider_name: "Cohere",
        description:
          "Cohere's lightweight English embedding model. Faster and more efficient for simpler tasks.",
        model_dim: 384,
        pricePerMillion: 0.1,
        mtebScore: 62,
        maxContext: 512,
        enabled: false,
      },
    ],
  },
  {
    id: 2,
    name: "Voyage",
    website: "https://www.voyageai.com",
    icon: VoyageIcon,
    description: "Focuses on advanced language models and embeddings.",
    docsLink:
      "https://docs.danswer.dev/guides/embedding_providers#voyage-models",
    apiLink: "https://www.voyageai.com/dashboard",
    costslink: "https://www.voyageai.com/pricing",
    embedding_models: [
      {
        cloud_provider_name: "Voyage",
        name: "voyage-large-2-instruct",
        description:
          "Voyage's large embedding model. High performance with instruction fine-tuning.",
        model_dim: 1024,
        normalize: true,
        pricePerMillion: 0.12,
        mtebScore: 68.28,
        maxContext: 4000,
        enabled: false,
      },
      {
        cloud_provider_name: "Voyage",
        name: "voyage-light-2-instruct",
        description:
          "Voyage's lightweight embedding model. Good balance of performance and efficiency.",
        model_dim: 1024,
        normalize: true,
        pricePerMillion: 0.12,
        mtebScore: 67.13,
        maxContext: 16000,
        enabled: false,
      },
    ],
  },
  {
    id: 3,
    name: "Vertex",
    website: "https://ai.google",
    icon: GoogleIcon,
    docsLink:
      "https://docs.danswer.dev/guides/embedding_providers#vertex-ai-google-model",
    description:
      "Offers a wide range of AI services including language and vision models.",
    apiLink: "https://console.cloud.google.com/apis/credentials",
    costslink: "https://cloud.google.com/vertex-ai/pricing",
    embedding_models: [
      {
        cloud_provider_name: "Vertex",
        name: "gecko",
        description:
          "Google's Gecko embedding model. Powerful and efficient, but requires more setup.",
        model_dim: 768,
        pricePerMillion: 0.025,
        mtebScore: 66.31,
        maxContext: 2048,
        notes:
          "Price is per character, not token. Longer setup time, need to configure Google Cloud Console with project ID, etc.",
        enabled: false,
      },
    ],
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
