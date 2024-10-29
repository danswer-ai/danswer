import React from "react";
import { getDisplayNameForModel } from "@/lib/hooks";
import { checkLLMSupportsImageInput, structureValue } from "@/lib/llm/utils";
import {
  getProviderIcon,
  LLMProviderDescriptor,
} from "@/app/admin/configuration/llm/interfaces";
import { Checkbox } from "@/components/ui/checkbox"; // Update the path as needed

interface LlmListProps {
  llmProviders: LLMProviderDescriptor[];
  currentLlm: string;
  onSelect: (value: string | null) => void;
  userDefault?: string | null;
  scrollable?: boolean;
  hideProviderIcon?: boolean;
  requiresImageGeneration?: boolean;
}

export const LlmList: React.FC<LlmListProps> = ({
  llmProviders,
  currentLlm,
  onSelect,
  userDefault,
  scrollable,
  requiresImageGeneration,
}) => {
  const llmOptionsByProvider: {
    [provider: string]: {
      name: string;
      value: string;
      icon: React.FC<{ size?: number; className?: string }>;
    }[];
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
            icon: getProviderIcon(llmProvider.provider),
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
      className={`max-h-[300px] overflow-y-auto bg-background-175 flex flex-col gap-y-1`}
    >
      {userDefault && (
        <div>
          <Checkbox
            key={-1}
            checked={currentLlm == null}
            onCheckedChange={(checked) => onSelect(checked ? null : currentLlm)}
          />
          <span>
            User Default (currently {getDisplayNameForModel(userDefault)})
          </span>
        </div>
      )}

      {llmOptions.map(({ name, icon, value }, index) => {
        if (!requiresImageGeneration || checkLLMSupportsImageInput(name)) {
          return (
            <div key={index} className="flex items-center gap-2">
              <Checkbox
                key={index}
                checked={currentLlm == name}
                onCheckedChange={(checked) => onSelect(checked ? value : null)}
              />
              {icon({ size: 16 })}
              <span>{getDisplayNameForModel(name)}</span>
            </div>
          );
        }
      })}
    </div>
  );
};
