import { useState } from "react";
import { ModalWrapper } from "@/components/modals/ModalWrapper";
import { Button, Callout, Divider, Text } from "@tremor/react";
import { Spinner } from "@/components/Spinner";
import { ChatSessionSharedStatus } from "../interfaces";
import { FiCopy } from "react-icons/fi";
import { CopyButton } from "@/components/CopyButton";
import { SEARCH_PARAM_NAMES } from "../searchParams";

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

async function generateCloneLink(
  message?: string,
  assistantId?: number,
  modelVersion?: string
) {
  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  return `${baseUrl}/chat${
    message
      ? `?${SEARCH_PARAM_NAMES.USER_PROMPT}=${encodeURIComponent(message)}`
      : ""
  }${
    assistantId
      ? `${message ? "&" : "?"}${SEARCH_PARAM_NAMES.PERSONA_ID}=${assistantId}`
      : ""
  }${
    modelVersion
      ? `${message || assistantId ? "&" : "?"}${SEARCH_PARAM_NAMES.MODEL_VERSION}=${encodeURIComponent(modelVersion)}`
      : ""
  }${message ? `&${SEARCH_PARAM_NAMES.SEND_ON_LOAD}=true` : ""}`;
}

async function deleteShareLink(chatSessionId: number) {
  const response = await fetch(`/api/chat/chat-session/${chatSessionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ sharing_status: "private" }),
  });

  return response.ok;
}

export function ShareChatSessionModal({
  chatSessionId,
  existingSharedStatus,
  onShare,
  onClose,
  message,
  assistantId,
  modelVersion,
}: {
  chatSessionId: number;
  existingSharedStatus: ChatSessionSharedStatus;
  onShare?: (shared: boolean) => void;
  onClose: () => void;
  message?: string;
  assistantId?: number;
  modelVersion?: string;
}) {
  const [shareLink, setShareLink] = useState<string>(
    existingSharedStatus === ChatSessionSharedStatus.Public
      ? buildShareLink(chatSessionId)
      : ""
  );

  return (
    <>
      <ModalWrapper onClose={onClose} modalClassName="max-w-3xl">
        <>
          <div className="flex mb-4">
            <h2 className="text-2xl text-emphasis font-bold flex my-auto">
              Share link to Chat
            </h2>
          </div>

          <div className="flex mt-2">
            {shareLink ? (
              <div>
                <Text>
                  This chat session is currently shared. Anyone at your
                  organization can view the message history using the following
                  link:
                </Text>

                <div className="flex mt-2">
                  <CopyButton content={shareLink} />
                  <a
                    href={shareLink}
                    target="_blank"
                    className="underline text-link mt-1 ml-1 text-sm my-auto"
                    rel="noreferrer"
                  >
                    {shareLink}
                  </a>
                </div>

                <Divider />

                <Text className="mb-4">
                  Click the button below to make the chat private again.
                </Text>

                <Button
                  onClick={async () => {
                    const success = await deleteShareLink(chatSessionId);
                    if (success) {
                      setShareLink("");
                      onShare && onShare(false);
                    } else {
                      alert("Failed to delete share link");
                    }
                  }}
                  size="xs"
                  color="red"
                >
                  Delete Share Link
                </Button>
              </div>
            ) : (
              <div>
                <Callout title="Warning" color="yellow" className="mb-4">
                  Ensure that all content in the chat is safe to share with the
                  whole organization. The content of the retrieved documents
                  will not be visible, but the names of cited documents as well
                  as the AI and human messages will be visible.
                </Callout>
                <div className="flex w-full justify-between">
                  <Button
                    icon={FiCopy}
                    onClick={async () => {
                      // NOTE: for "inescure" non-https setup, the `navigator.clipboard.writeText` may fail
                      // as the browser may not allow the clipboard to be accessed.
                      try {
                        const shareLink =
                          await generateShareLink(chatSessionId);
                        if (!shareLink) {
                          alert("Failed to generate share link");
                        } else {
                          setShareLink(shareLink);
                          onShare && onShare(true);
                          navigator.clipboard.writeText(shareLink);
                        }
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    size="xs"
                    color="green"
                  >
                    Generate and Copy Share Link
                  </Button>
                  <Button
                    icon={FiCopy}
                    onClick={async () => {
                      // NOTE: for "inescure" non-https setup, the `navigator.clipboard.writeText` may fail
                      // as the browser may not allow the clipboard to be accessed.
                      try {
                        const shareLink = await generateCloneLink(
                          message,
                          assistantId,
                          modelVersion
                        );
                        console.log(shareLink);
                        console.log(message, assistantId, modelVersion);
                        navigator.clipboard.writeText(shareLink);
                      } catch (e) {
                        console.error(e);
                      }
                    }}
                    size="xs"
                    color="green"
                  >
                    Generate and Copy Link to Current Query
                  </Button>
                </div>
              </div>
            )}
          </div>
        </>
      </ModalWrapper>
    </>
  );
}
