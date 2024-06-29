import { LLMProviderDescriptor } from "@/app/admin/models/llm/interfaces";
import { fetchSS } from "../utilsSS";

export async function fetchLLMProvidersSS() {
  const response = await fetchSS("/llm/provider");
  if (response.ok) {
    return (await response.json()) as LLMProviderDescriptor[];
  }
  return [];
}


// import { LLMProviderDescriptor } from "@/app/admin/models/llm/interfaces";
// import { fetchSS } from "../utilsSS";

export async function fetchEmbeddingProvidersSS() {
  const response = await fetchSS("/llm/embedding-provider");
  if (response.ok) {
    const test = await response.json()
    console.log(test)
    return []
    // return (await response.json()) as LLMProviderDescriptor[];
  }
  return [];
}


