"use client";

import { Modal } from "@/components/Modal";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Button } from "@tremor/react";
import { useContext, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ALL_USERS_INITIAL_POPUP_FLOW_COMPLETED =
  "allUsersInitialPopupFlowCompleted";
export function ChatPopup() {
  const [completedFlow, setCompletedFlow] = useState(true);

  useEffect(() => {
    setCompletedFlow(
      localStorage.getItem(ALL_USERS_INITIAL_POPUP_FLOW_COMPLETED) === "true"
    );
  });

  const settings = useContext(SettingsContext);
  const enterpriseSettings = settings?.enterpriseSettings;
  const isConsentScreen = enterpriseSettings?.enable_consent_screen;

  if (
    (!settings?.enterpriseSettings?.custom_popup_content && !isConsentScreen) ||
    completedFlow
  ) {
    return null;
  }

  let popupTitle = enterpriseSettings?.custom_popup_header;
  if (!popupTitle) {
    popupTitle = isConsentScreen
      ? "Terms of Use"
      : `Welcome to ${enterpriseSettings?.application_name || "Danswer"}!`;
  }

  const popupContent =
    enterpriseSettings?.custom_popup_content ||
    (isConsentScreen
      ? "By clicking 'I Agree', you acknowledge that you agree to the terms of use of this application and consent to proceed."
      : "");

  return (
    <Modal width="w-3/6 xl:w-[700px]" title={popupTitle}>
      <>
        <ReactMarkdown
          className="prose max-w-full"
          components={{
            a: ({ node, ...props }) => (
              <a
                {...props}
                className="text-link hover:text-link-hover"
                target="_blank"
                rel="noopener noreferrer"
              />
            ),
            p: ({ node, ...props }) => <p {...props} className="text-sm" />,
          }}
          remarkPlugins={[remarkGfm]}
        >
          {popupContent}
        </ReactMarkdown>

        <div className="flex w-full justify-center gap-4 mt-4">
          {isConsentScreen && (
            <Button size="xs" color="red" onClick={() => {}}>
              Cancel
            </Button>
          )}
          <Button
            size="xs"
            onClick={() => {
              localStorage.setItem(
                ALL_USERS_INITIAL_POPUP_FLOW_COMPLETED,
                "true"
              );
              setCompletedFlow(true);
            }}
          >
            {isConsentScreen ? "I Agree" : "Get started!"}
          </Button>
        </div>
      </>
    </Modal>
  );
}
