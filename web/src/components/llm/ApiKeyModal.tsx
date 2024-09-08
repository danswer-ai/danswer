"use client";

import { useState, useEffect } from "react";
import { ApiKeyForm } from "./ApiKeyForm";
import { Modal } from "../Modal";
import { WellKnownLLMProviderDescriptor } from "@/app/admin/configuration/llm/interfaces";
import { checkLlmProvider } from "../initialSetup/welcome/lib";
import { User } from "@/lib/types";
import { useRouter } from "next/navigation";

export const ApiKeyModal = ({
  user,
  hide,
}: {
  user: User | null;
  hide: () => void;
}) => {
  const router = useRouter();

  const [validProviderExists, setValidProviderExists] = useState<boolean>(true);
  const [providerOptions, setProviderOptions] = useState<
    WellKnownLLMProviderDescriptor[]
  >([]);

  useEffect(() => {
    async function fetchProviderInfo() {
      const { providers, options, defaultCheckSuccessful } =
        await checkLlmProvider(user);
      setValidProviderExists(providers.length > 0 && defaultCheckSuccessful);
      setProviderOptions(options);
    }

    fetchProviderInfo();
  }, []);

  // don't show if
  //  (1) a valid provider has been setup or
  //  (2) there are no provider options (e.g. user isn't an admin)
  //  (3) user explicitly hides the modal
  if (validProviderExists || !providerOptions.length) {
    return null;
  }

  return (
    <Modal
      title="Welcome to Danswer!"
      className="max-w-3xl"
      onOutsideClick={() => hide()}
    >
      <div className="max-h-[75vh] overflow-y-auto flex flex-col px-4">
        <div>
          <div className="mb-5 text-sm">
            Please provide an API Key below in order to start using Danswer. You
            can always change this later!
            <br />
            Or if you&apos;d rather look around first, you can
            <strong onClick={() => hide()} className="text-link cursor-pointer">
              {" "}
              skip this step
            </strong>
            .
          </div>

          <ApiKeyForm
            onSuccess={() => {
              router.refresh();
              hide();
            }}
            providerOptions={providerOptions}
          />
        </div>
      </div>
    </Modal>
  );
};
