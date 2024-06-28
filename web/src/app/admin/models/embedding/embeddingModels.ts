export interface EmbeddingModelResponse {
  model_name: string | null;
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



export interface FullCloudbasedEmbeddingModelDescriptor extends FullEmbeddingModelDescriptor {
  description: string;
  isDefault?: boolean;
  link?: string;
  pricePerMillion?: number;
  docs_link?: string;
  
}


export const AVAILABLE_CLOUD_MODELS: FullCloudbasedEmbeddingModelDescriptor[] = [
  {
    model_name: "text-embedding-3-small",
    model_dim: 1536,
    normalize: true,
    description: "OpenAI's newer, more efficient embedding model. Good balance of performance and cost.",
    link: "https://platform.openai.com/docs/guides/embeddings",
    query_prefix: "",
    passage_prefix: "",
    pricePerMillion: 0.02
  },
  {
    model_name: "text-embedding-3-large",
    model_dim: 3072,
    normalize: true,
    description: "OpenAI's large embedding model. Best performance, but more expensive.",
    link: "https://platform.openai.com/docs/guides/embeddings",
    query_prefix: "",
    passage_prefix: "",
    pricePerMillion: 0.13
  },
  {
    model_name: "embed-english-v3.0",
    model_dim: 1024,
    normalize: true,
    description: "Cohere's English embedding model. Good performance for English-language tasks.",
    link: "https://docs.cohere.com/docs/cohere-embed",
    query_prefix: "",
    passage_prefix: "",
    pricePerMillion: 0.1
  },
  {
    model_name: "embed-english-light-v3.0",
    model_dim: 384,
    normalize: true,
    description: "Cohere's lightweight English embedding model. Faster and more efficient for simpler tasks.",
    link: "https://docs.cohere.com/docs/cohere-embed",
    query_prefix: "",
    passage_prefix: "",
    pricePerMillion: 0.1
  },
  {
    model_name: "voyage-large-2-instruct",
    model_dim: 1024,
    normalize: true,
    description: "Voyage AI's large embedding model. High performance with instruction fine-tuning.",
    link: "https://docs.voyageai.com/docs/embeddings",
    query_prefix: "",
    passage_prefix: "",
    pricePerMillion: 0.12
  },
  {
    model_name: "voyage-light-2-instruct",
    model_dim: 1024,
    normalize: true,
    description: "Voyage AI's lightweight embedding model. Good balance of performance and efficiency.",
    link: "https://docs.voyageai.com/docs/embeddings",
    query_prefix: "",
    passage_prefix: "",
    pricePerMillion: 0.12
  },
  {
    model_name: "gecko",
    model_dim: 768,
    normalize: true,
    description: "Google's Gecko embedding model. Powerful and efficient, but requires more setup.",
    link: "https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/text-embeddings",
    query_prefix: "",
    passage_prefix: "",
    pricePerMillion: 0.025 // Note: This is per character, not per token
  }
];





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

export const INVALID_OLD_MODEL = "thenlper/gte-small";

export function checkModelNameIsValid(modelName: string | undefined | null) {
  if (!modelName) {
    return false;
  }
  if (modelName === INVALID_OLD_MODEL) {
    return false;
  }
  return true;
}

export function fillOutEmeddingModelDescriptor(
  embeddingModel: EmbeddingModelDescriptor | FullEmbeddingModelDescriptor
): FullEmbeddingModelDescriptor {
  return {
    ...embeddingModel,
    description: "",
  };
}
