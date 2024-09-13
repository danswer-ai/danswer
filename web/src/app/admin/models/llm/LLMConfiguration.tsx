"use client";

import { Modal } from "@/components/Modal";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { useState } from "react";
import useSWR from "swr";
import { Callout } from "@tremor/react";
import { ThreeDotsLoader } from "@/components/Loading";
import { FullLLMProvider, WellKnownLLMProviderDescriptor } from "./interfaces";
import { LLMProviderUpdateForm } from "./LLMProviderUpdateForm";
import { LLM_PROVIDERS_ADMIN_URL } from "./constants";
import { CustomLLMProviderUpdateForm } from "./CustomLLMProviderUpdateForm";
import { ConfiguredLLMProviderDisplay } from "./ConfiguredLLMProviderDisplay";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/CustomModal";

function LLMProviderUpdateModal({
  llmProviderDescriptor,
  onClose,
  existingLlmProvider,
  shouldMarkAsDefault,
}: {
  llmProviderDescriptor: WellKnownLLMProviderDescriptor | null;
  onClose: () => void;
  existingLlmProvider?: FullLLMProvider;
  shouldMarkAsDefault?: boolean;
}) {
  const providerName =
    llmProviderDescriptor?.display_name ||
    llmProviderDescriptor?.name ||
    existingLlmProvider?.name ||
    "Custom LLM Provider";
  return (
    <div className="px-4">
      {/* <h2 className="text-2xl font-semibold pb-6">{`Setup ${providerName}`}</h2> */}
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

function DefaultLLMProviderDisplay({
  llmProviderDescriptor,
  shouldMarkAsDefault,
}: {
  llmProviderDescriptor: WellKnownLLMProviderDescriptor | null;
  shouldMarkAsDefault?: boolean;
}) {
  const [formIsVisible, setFormIsVisible] = useState(false);

  const providerName =
    llmProviderDescriptor?.display_name || llmProviderDescriptor?.name;

  const handleClose = () => {
    setFormIsVisible(false);
  };

  return (
    <div className="flex p-3 border rounded shadow-sm border-border md:w-96">
      <div className="my-auto">
        <div className="font-bold">{providerName} </div>
      </div>

      <div className="ml-auto">
        <CustomModal
          trigger={
            <Button onClick={() => setFormIsVisible(true)}>Set up</Button>
          }
          open={formIsVisible}
          onClose={handleClose}
          title={`Setup ${providerName}`}
        >
          <LLMProviderUpdateModal
            llmProviderDescriptor={llmProviderDescriptor}
            onClose={handleClose}
            shouldMarkAsDefault={shouldMarkAsDefault}
          />
        </CustomModal>
      </div>
    </div>
  );
}

function AddCustomLLMProvider({
  existingLlmProviders,
}: {
  existingLlmProviders: FullLLMProvider[];
}) {
  const [formIsVisible, setFormIsVisible] = useState(false);

  const handleClose = () => {
    setFormIsVisible(false);
  };

  return (
    <CustomModal
      trigger={
        <Button onClick={() => setFormIsVisible(true)}>
          Add Custom LLM Provider
        </Button>
      }
      onClose={handleClose}
      open={formIsVisible}
      title="Setup Custom LLM Provider"
    >
      <div className="px-4">
        <CustomLLMProviderUpdateForm
          onClose={handleClose}
          shouldMarkAsDefault={existingLlmProviders.length === 0}
        />
      </div>
    </CustomModal>
  );
}

export function LLMConfiguration() {
  const { data: llmProviderDescriptors } = useSWR<
    WellKnownLLMProviderDescriptor[]
  >("/api/admin/llm/built-in/options", errorHandlingFetcher);
  const { data: existingLlmProviders } = useSWR<FullLLMProvider[]>(
    LLM_PROVIDERS_ADMIN_URL,
    errorHandlingFetcher
  );

  if (!llmProviderDescriptors || !existingLlmProviders) {
    return <ThreeDotsLoader />;
  }

  return (
    <>
      <h3 className="pb-5 font-semibold">Enabled LLM Providers</h3>

      {existingLlmProviders.length > 0 ? (
        <>
          <p className="pb-4">
            If multiple LLM providers are enabled, the default provider will be
            used for all &quot;Default&quot; Assistants. For user-created
            Assistants, you can select the LLM provider/model that best fits the
            use case!
          </p>
          <ConfiguredLLMProviderDisplay
            existingLlmProviders={existingLlmProviders}
            llmProviderDescriptors={llmProviderDescriptors}
          />
        </>
      ) : (
        <Callout title="No LLM providers configured yet" color="yellow">
          Please set one up below in order to start using enMedD AI!
        </Callout>
      )}

      <h3 className="pb-5 font-semibold">Add LLM Provider</h3>
      <p className="pb-4">
        Add a new LLM provider by either selecting from one of the default
        providers or by specifying your own custom LLM provider.
      </p>

      <div className="flex flex-col gap-y-4">
        {llmProviderDescriptors.map((llmProviderDescriptor) => {
          return (
            <DefaultLLMProviderDisplay
              key={llmProviderDescriptor.name}
              llmProviderDescriptor={llmProviderDescriptor}
              shouldMarkAsDefault={existingLlmProviders.length === 0}
            />
          );
        })}
      </div>

      <div className="mt-4">
        <AddCustomLLMProvider existingLlmProviders={existingLlmProviders} />
      </div>
    </>
  );
}
