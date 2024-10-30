"use client";

import { ApiKeyForm } from "./ApiKeyForm";
import { Modal } from "../Modal";
import { useRouter } from "next/navigation";
import { useProviderStatus } from "../chat_search/ProviderContext";
import { PopupSpec } from "../admin/connectors/Popup";
import { useTranslation } from "react-i18next";

export const ApiKeyModal = ({
  hide,
  setPopup,
}: {
  hide: () => void;
  setPopup: (popup: PopupSpec) => void;
}) => {
  const router = useRouter();
  const { t } = useTranslation("modal");

  const {
    shouldShowConfigurationNeeded,
    providerOptions,
    refreshProviderInfo,
  } = useProviderStatus();

  if (!shouldShowConfigurationNeeded) {
    return null;
  }
  return (
    <Modal
      title={t("Configure a Generative AI Model")}
      width="max-w-3xl w-full"
      onOutsideClick={() => hide()}
    >
      <>
        <div className="mb-5 text-sm text-gray-700">
          {t("Please provide an API Key – you can always change this or switch models later.")}
          <br />
          {t("If you would rather look around first, you can")}{" "}
          <strong onClick={() => hide()} className="text-link cursor-pointer">
            {t("skip this step")}
          </strong>
          .
        </div>

        <ApiKeyForm
          setPopup={setPopup}
          onSuccess={() => {
            router.refresh();
            refreshProviderInfo();
            hide();
          }}
          providerOptions={providerOptions}
        />
      </>
    </Modal>
  );
};
