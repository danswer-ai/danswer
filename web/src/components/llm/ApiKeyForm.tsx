import { WellKnownLLMProviderDescriptor } from "@/app/admin/models/llm/interfaces";
import { LLMProviderUpdateForm } from "@/app/admin/models/llm/LLMProviderUpdateForm";
import { CustomLLMProviderUpdateForm } from "@/app/admin/models/llm/CustomLLMProviderUpdateForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";

export const ApiKeyForm = ({
  onSuccess,
  providerOptions,
}: {
  onSuccess: () => void;
  providerOptions: WellKnownLLMProviderDescriptor[];
}) => {
  const defaultProvider = providerOptions[0]?.name;
  const providerNameToIndexMap = new Map<string, number>();
  providerOptions.forEach((provider, index) => {
    providerNameToIndexMap.set(provider.name, index);
  });
  providerNameToIndexMap.set("custom", providerOptions.length);

  const providerIndexToNameMap = new Map<number, string>();
  Array.from(providerNameToIndexMap.keys()).forEach((key) => {
    providerIndexToNameMap.set(providerNameToIndexMap.get(key)!, key);
  });

  return (
    <Tabs defaultValue="openai">
      <TabsList>
        <TabsTrigger value="openai">OpenAI</TabsTrigger>
        <TabsTrigger value="anthropic">Anthropic</TabsTrigger>
        <TabsTrigger value="azure">Azure OpenAI</TabsTrigger>
        <TabsTrigger value="bedrock">AWS Bedrock</TabsTrigger>
        <TabsTrigger value="custom">Custom</TabsTrigger>
      </TabsList>
      {providerOptions.map((provider) => {
        return (
          <TabsContent value={provider.name} key={provider.name}>
            <LLMProviderUpdateForm
              llmProviderDescriptor={provider}
              onClose={() => onSuccess()}
              shouldMarkAsDefault
            />
          </TabsContent>
        );
      })}
      <TabsContent value="custom">
        <CustomLLMProviderUpdateForm
          onClose={() => onSuccess()}
          shouldMarkAsDefault
        />
      </TabsContent>
    </Tabs>
  );
};
