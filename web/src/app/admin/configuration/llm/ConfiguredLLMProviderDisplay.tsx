import { FullLLMProvider, WellKnownLLMProviderDescriptor } from "./interfaces";
import { LLMProviderUpdateForm } from "./LLMProviderUpdateForm";
import { CustomLLMProviderUpdateForm } from "./CustomLLMProviderUpdateForm";
import { useState } from "react";
import { LLM_PROVIDERS_ADMIN_URL } from "./constants";
import { mutate } from "swr";
import isEqual from "lodash/isEqual";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomModal } from "@/components/CustomModal";
import { useToast } from "@/hooks/use-toast";

function LLMProviderUpdateModal({
  llmProviderDescriptor,
  onClose,
  existingLlmProvider,
  shouldMarkAsDefault,
}: {
  llmProviderDescriptor: WellKnownLLMProviderDescriptor | null | undefined;
  onClose: () => void;
  existingLlmProvider?: FullLLMProvider;
  shouldMarkAsDefault?: boolean;
}) {
  return (
    <div>
      {llmProviderDescriptor ? (
        <LLMProviderUpdateForm
          llmProviderDescriptor={llmProviderDescriptor}
          onClose={onClose}
          existingLlmProvider={existingLlmProvider}
          shouldMarkAsDefault={shouldMarkAsDefault}
        />
      ) : (
        <CustomLLMProviderUpdateForm
          onClose={onClose}
          existingLlmProvider={existingLlmProvider}
          shouldMarkAsDefault={shouldMarkAsDefault}
        />
      )}
    </div>
  );
}

function LLMProviderDisplay({
  llmProviderDescriptor,
  existingLlmProvider,
  shouldMarkAsDefault,
}: {
  llmProviderDescriptor: WellKnownLLMProviderDescriptor | null | undefined;
  existingLlmProvider: FullLLMProvider;
  shouldMarkAsDefault?: boolean;
}) {
  const [formIsVisible, setFormIsVisible] = useState(false);
  const { toast } = useToast();

  const providerName = existingLlmProvider?.name
    ? existingLlmProvider.name
    : llmProviderDescriptor?.display_name ||
      llmProviderDescriptor?.name ||
      "Custom LLM Provider";

  const handleClose = () => {
    setFormIsVisible(false);
  };

  return (
    <div className="flex flex-col sm:flex-row p-3 border rounded shadow-sm border-border md:w-96 gap-3">
      <div className="my-auto">
        <div className="font-bold truncate max-w-52">{providerName} </div>
        <div className="text-xs italic">({existingLlmProvider.provider})</div>
        {!existingLlmProvider.is_default_provider && (
          <div
            className="pt-1 text-xs cursor-pointer text-link"
            onClick={async () => {
              const response = await fetch(
                `${LLM_PROVIDERS_ADMIN_URL}/${existingLlmProvider.id}/default`,
                {
                  method: "POST",
                }
              );
              if (!response.ok) {
                const errorMsg = (await response.json()).detail;
                toast({
                  title: "Failed to Set Default Provider",
                  description: `Unable to set "${existingLlmProvider.name}" as the default provider: ${errorMsg}`,
                  variant: "destructive",
                });
                return;
              }

              mutate(LLM_PROVIDERS_ADMIN_URL);
              toast({
                title: "Default Provider Set",
                description: `"${existingLlmProvider.name}" is now the default provider!`,
                variant: "success",
              });
            }}
          >
            Set as default
          </div>
        )}
      </div>

      {existingLlmProvider && (
        <div className="my-auto">
          {existingLlmProvider.is_default_provider ? (
            <Badge variant="outline">Default</Badge>
          ) : (
            <Badge variant="success">Enabled</Badge>
          )}
        </div>
      )}

      <div className="ml-auto w-full sm:w-auto">
        <CustomModal
          trigger={
            <Button
              variant={existingLlmProvider ? "outline" : "default"}
              onClick={() => setFormIsVisible(true)}
              className="w-full sm:w-auto"
            >
              {existingLlmProvider ? "Edit" : "Set up"}
            </Button>
          }
          onClose={handleClose}
          open={formIsVisible}
          title={`${
            llmProviderDescriptor ? "Configure" : "Setup"
          } ${providerName}`}
        >
          <LLMProviderUpdateModal
            llmProviderDescriptor={llmProviderDescriptor}
            onClose={handleClose}
            existingLlmProvider={existingLlmProvider}
            shouldMarkAsDefault={shouldMarkAsDefault}
          />
        </CustomModal>
      </div>
    </div>
  );
}

export function ConfiguredLLMProviderDisplay({
  existingLlmProviders,
  llmProviderDescriptors,
}: {
  existingLlmProviders: FullLLMProvider[];
  llmProviderDescriptors: WellKnownLLMProviderDescriptor[];
}) {
  existingLlmProviders = existingLlmProviders.sort((a, b) => {
    if (a.is_default_provider && !b.is_default_provider) {
      return -1;
    }
    if (!a.is_default_provider && b.is_default_provider) {
      return 1;
    }
    return a.provider > b.provider ? 1 : -1;
  });

  return (
    <div className="flex flex-col gap-y-4 pb-10">
      {existingLlmProviders.map((provider) => {
        const defaultProviderDesciptor = llmProviderDescriptors.find(
          (llmProviderDescriptors) =>
            llmProviderDescriptors.name === provider.provider
        );

        return (
          <LLMProviderDisplay
            key={provider.id}
            // if the user has specified custom model names,
            // then the provider is custom - don't use the default
            // provider descriptor
            llmProviderDescriptor={
              isEqual(provider.model_names, defaultProviderDesciptor?.llm_names)
                ? defaultProviderDesciptor
                : null
            }
            existingLlmProvider={provider}
          />
        );
      })}
    </div>
  );
}
