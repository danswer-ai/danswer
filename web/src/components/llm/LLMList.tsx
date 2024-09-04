import React from "react";
import { getDisplayNameForModel } from "@/lib/hooks";
import { structureValue } from "@/lib/llm/utils";
import { LLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";

interface LlmListProps {
  llmProviders: LLMProviderDescriptor[];
  currentLlm: string;
  onSelect: (value: string | null) => void;
  userDefault?: string | null;
  scrollable?: boolean;
}

export const LlmList: React.FC<LlmListProps> = ({
  llmProviders,
  currentLlm,
  onSelect,
  userDefault,
  scrollable,
}) => {
  const llmOptionsByProvider: {
    [provider: string]: { name: string; value: string }[];
  } = {};
  const uniqueModelNames = new Set<string>();

  llmProviders.forEach((llmProvider) => {
    if (!llmOptionsByProvider[llmProvider.provider]) {
      llmOptionsByProvider[llmProvider.provider] = [];
    }

    (llmProvider.display_model_names || llmProvider.model_names).forEach(
      (modelName) => {
        if (!uniqueModelNames.has(modelName)) {
          uniqueModelNames.add(modelName);
          llmOptionsByProvider[llmProvider.provider].push({
            name: modelName,
            value: structureValue(
              llmProvider.name,
              llmProvider.provider,
              modelName
            ),
          });
        }
      }
    );
  });

  const llmOptions = Object.entries(llmOptionsByProvider).flatMap(
    ([provider, options]) => [...options]
  );

  return (
    <div
      className={`${scrollable ? "max-h-[200px] include-scrollbar" : "max-h-[300px]"} bg-background-175 flex flex-col gap-y-1 overflow-y-scroll`}
    >
      {userDefault && (
        <button
          type="button"
          key={-1}
          className={`w-full py-1.5 px-2 text-sm ${
            currentLlm == null
              ? "bg-background-200"
              : "bg-background hover:bg-background-100"
          } text-left rounded`}
          onClick={() => onSelect(null)}
        >
          User Default (currently {getDisplayNameForModel(userDefault)})
        </button>
      )}
      {llmOptions.map(({ name, value }, index) => (
        <button
          type="button"
          key={index}
          className={`w-full py-1.5 px-2 text-sm ${
            currentLlm == name
              ? "bg-background-200"
              : "bg-background hover:bg-background-100"
          } text-left rounded`}
          onClick={() => onSelect(value)}
        >
          {getDisplayNameForModel(name)}
        </button>
      ))}
    </div>
  );
};
