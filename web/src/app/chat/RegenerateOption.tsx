import { useChatContext } from "@/context/ChatContext";
import {
  getDisplayNameForModel,
  LlmOverride,
  useLlmOverride,
} from "@/lib/hooks";
import {
  DefaultDropdownElement,
  StringOrNumberOption,
} from "@/components/Dropdown";

import { Assistant } from "@/app/admin/assistants/interfaces";
import { destructureValue, getFinalLLM, structureValue } from "@/lib/llm/utils";
import { useState } from "react";
import { Popover } from "@/components/popover/Popover";
import { Star } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";

export function RegenerateDropdown({
  options,
  selected,
  onSelect,
  side,
  maxHeight,
  alternate,
}: {
  alternate?: string;
  options: StringOrNumberOption[];
  selected: string | null;
  onSelect: (value: string | number | null) => void;
  includeDefault?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  maxHeight?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const Dropdown = (
    <div
      className={`
                border
                rounded-lg
                flex
                flex-col
                mx-2
                bg-background
                ${maxHeight || "max-h-96"}
                overflow-y-auto
                overscroll-contain relative`}
    >
      <p
        className="
                sticky
                top-0
                flex
                bg-background
                font-bold
                px-3
                text-sm
                py-1.5
                "
      >
        Pick a model
      </p>
      {options.map((option, ind) => {
        const isSelected = option.value === selected;
        return (
          <DefaultDropdownElement
            key={option.value}
            name={getDisplayNameForModel(option.name)}
            description={option.description}
            onSelect={() => onSelect(option.value)}
            isSelected={isSelected}
          />
        );
      })}
    </div>
  );

  return (
    <Popover
      open={isOpen}
      onOpenChange={(open) => setIsOpen(open)}
      content={
        <CustomTooltip
          trigger={
            <div
              onClick={() => setIsOpen(!isOpen)}
              className={`hover:bg-light hover:text-accent-foreground focus-visible:ring-light p-2 rounded-xs cursor-pointer`}
            >
              <Star size={16} />
            </div>
          }
          asChild
        >
          Pick a model
        </CustomTooltip>
      }
      popover={Dropdown}
      align="start"
      side={side}
      sideOffset={5}
      triggerMaxWidth
    />
  );
}

export default function RegenerateOption({
  selectedAssistant,
  regenerate,
  overriddenModel,
}: {
  selectedAssistant: Assistant;
  regenerate: (modelOverRide: LlmOverride) => Promise<void>;
  overriddenModel?: string;
}) {
  const llmOverrideManager = useLlmOverride();

  const { llmProviders } = useChatContext();
  const [_, llmName] = getFinalLLM(llmProviders, selectedAssistant, null);

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

  const currentModelName =
    llmOverrideManager?.llmOverride.modelName ||
    (selectedAssistant
      ? selectedAssistant.llm_model_version_override || llmName
      : llmName);

  return (
    <div className="group flex items-center relative">
      <RegenerateDropdown
        alternate={overriddenModel}
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
