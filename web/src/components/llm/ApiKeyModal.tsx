"use client";

import { ApiKeyForm } from "./ApiKeyForm";
import { Modal } from "../Modal";
import { useRouter } from "next/navigation";
import { useProviderStatus } from "../chat_search/ProviderContext";
import { CustomModal } from "../CustomModal";

export const ApiKeyModal = ({
  hide,
  isOpen,
}: {
  hide: () => void;
  isOpen?: boolean;
}) => {
  const router = useRouter();

  const {
    shouldShowConfigurationNeeded,
    providerOptions,
    refreshProviderInfo,
  } = useProviderStatus();

  if (!shouldShowConfigurationNeeded) {
    return null;
  }
  return (
    <CustomModal
      title="Set an API Key!"
      onClose={() => hide()}
      trigger={null}
      open={isOpen}
    >
      <>
        <div className="text-sm text-gray-700">
          Please provide an API Key below in order to start using Danswer – you
          can always change this later.
          <br />
          If you&apos;d rather look around first, you can
          <strong onClick={() => hide()} className="text-link cursor-pointer">
            {" "}
            skip this step
          </strong>
          .
        </div>

        <ApiKeyForm
          onSuccess={() => {
            router.refresh();
            refreshProviderInfo();
            hide();
          }}
          providerOptions={providerOptions}
        />
      </>
    </CustomModal>
  );
};
