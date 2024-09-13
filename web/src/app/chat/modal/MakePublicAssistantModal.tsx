import { useState } from "react";
import { ModalWrapper } from "@/components/modals/ModalWrapper";
import { Button, Callout, Divider, Text } from "@tremor/react";
import { Spinner } from "@/components/Spinner";
import { FiCopy, FiX } from "react-icons/fi";
import { CopyButton } from "@/components/CopyButton";
import { ChatSessionSharedStatus } from "../interfaces";
import { togglePersonaVisibility } from "@/app/admin/assistants/lib";

function buildShareLink(chatSessionId: number) {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return `${baseUrl}/chat/shared/${chatSessionId}`;
}

async function generateShareLink(chatSessionId: number) {
  const response = await fetch(`/api/chat/chat-session/${chatSessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sharing_status: "public" }),
  });

  if (response.ok) {
    return buildShareLink(chatSessionId);
  }
  return null;
}

export function MakePublicAssistantModal({
  isPublic,
  onShare,
  onClose,
}: {
  isPublic: boolean;
  onShare: (shared: boolean) => void;
  onClose: () => void;
}) {
  return (
    <ModalWrapper onClose={onClose} modalClassName="max-w-3xl">
      <>
        <div className="flex mb-4">
          <h2 className="text-2xl text-emphasis font-bold flex my-auto">
            Make Assistant Public
          </h2>
        </div>

        <div className="flex mt-2">
          <div>
            <Text>
              This assistant is currently {isPublic ? "public" : "private"}.
              {isPublic
                ? " Anyone with the link can view and use this assistant."
                : " Only you can access this assistant."}
            </Text>

            <Divider className="my-4" />

            {isPublic ? (
              <>
                <Text className="mb-4">
                  Click the button below to make the assistant private again.
                </Text>
                <Button
                  onClick={async () => {
                    await onShare?.(false);
                    onClose();
                  }}
                  size="xs"
                  color="red"
                >
                  Make Assistant Private
                </Button>
              </>
            ) : (
              <>
                <Callout title="Warning" color="yellow" className="mb-4">
                  Making this assistant public will allow anyone with the link
                  to view and use it. Ensure that all content and capabilities
                  of the assistant are safe to share.
                </Callout>
                <Button
                  onClick={async () => {
                    await onShare?.(true);
                    onClose();
                  }}
                  size="xs"
                  color="green"
                >
                  Make Assistant Public
                </Button>
              </>
            )}
          </div>
        </div>
      </>
    </ModalWrapper>
  );
}
