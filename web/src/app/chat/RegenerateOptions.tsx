import { useChatContext } from "@/components/context/ChatContext";
import { LlmOverride, LlmOverrideManager, useLlmOverride } from "@/lib/hooks";
import { RegenerateDropdown } from "@/components/Dropdown";

import { Persona } from "@/app/admin/assistants/interfaces";
import { getFinalLLM } from "@/lib/llm/utils";

export default function RegenerateOption({
  selectedAssistant,
  regenerate,
  alternateModel,
}: {
  selectedAssistant: Persona;
  regenerate: (modelOverRide: LlmOverride) => Promise<void>;
  alternateModel?: string;
}) {
  const llmOverrideManager = useLlmOverride();

  const { llmProviders } = useChatContext();
  const [_, llmName] = getFinalLLM(llmProviders, selectedAssistant);
  const llmOptions: { name: string; value: string }[] = [];
  const structureValue = (
    name: string,
    provider: string,
    modelName: string
  ) => {
    return `${name}__${provider}__${modelName}`;
  };
  const destructureValue = (value: string): LlmOverride => {
    const [displayName, provider, modelName] = value.split("__");
    return {
      name: displayName,
      provider,
      modelName,
    };
  };
  llmProviders.forEach((llmProvider) => {
    llmProvider.model_names.forEach((modelName) => {
      llmOptions.push({
        name: modelName,
        value: structureValue(
          llmProvider.name,
          llmProvider.provider,
          modelName
        ),
      });
    });
  });

  const currentModelName =
    llmOverrideManager?.llmOverride.modelName ||
    (selectedAssistant
      ? selectedAssistant.llm_model_version_override || llmName
      : llmName);

  return (
    <div className="group flex items-center relative">
      <RegenerateDropdown
        alternate={alternateModel}
        options={llmOptions}
        selected={currentModelName}
        onSelect={(value) => {
          const { name, provider, modelName } = destructureValue(
            value as string
          );
          regenerate({
            name: name,
            provider: provider,
            modelName: modelName,
          });
        }}
      />
    </div>
  );
}
