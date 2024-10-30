import { useState } from "react";
import { WellKnownLLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { LLMProviderUpdateForm } from "@/app/admin/configuration/llm/LLMProviderUpdateForm";
import { CustomLLMProviderUpdateForm } from "@/app/admin/configuration/llm/CustomLLMProviderUpdateForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Card, CardContent } from "../ui/card";

export const ApiKeyForm = ({
  onSuccess,
  providerOptions,
  hideSuccess,
}: {
  onSuccess: () => void;
  providerOptions: WellKnownLLMProviderDescriptor[];
  hideSuccess?: boolean;
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

  const [providerName, setProviderName] = useState<string>(defaultProvider);

  return (
    <div className="pb-10">
      <Tabs
        defaultValue={
          providerNameToIndexMap.get(providerName)?.toString() || "0"
        }
        onValueChange={(value) =>
          setProviderName(
            providerIndexToNameMap.get(Number(value)) || defaultProvider
          )
        }
      >
        <TabsList className="mt-3 mb-4">
          {providerOptions.map((provider, index) => (
            <TabsTrigger key={provider.name} value={index.toString()}>
              {provider.display_name || provider.name}
            </TabsTrigger>
          ))}
          <TabsTrigger key="custom" value="custom">
            Custom
          </TabsTrigger>
        </TabsList>

        {providerOptions.map((provider, index) => (
          <TabsContent key={provider.name} value={index.toString()}>
            <Card>
              <CardContent>
                <LLMProviderUpdateForm
                  hideAdvanced
                  llmProviderDescriptor={provider}
                  onClose={() => onSuccess()}
                  shouldMarkAsDefault
                  hideSuccess={hideSuccess}
                />
              </CardContent>
            </Card>
          </TabsContent>
        ))}

        <TabsContent key="custom" value="custom">
          <Card>
            <CardContent>
              <CustomLLMProviderUpdateForm
                onClose={() => onSuccess()}
                shouldMarkAsDefault
                hideSuccess={hideSuccess}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
