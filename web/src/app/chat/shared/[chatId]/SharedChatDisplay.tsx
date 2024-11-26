"use client";

import { useEffect, useState } from "react";
import Prism from "prismjs";
import { humanReadableFormat } from "@/lib/time";
import { BackendChatSession } from "../../interfaces";
import {
  buildLatestMessageChain,
  getCitedDocumentsFromMessage,
  processRawChatHistory,
} from "../../lib";
import { AIMessage, HumanMessage } from "../../message/Messages";
import { Callout } from "@tremor/react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Divider } from "@/components/Divider";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { ThreeDotsLoader } from "@/components/Loading";

function BackToEnmeddButton() {
  const router = useRouter();

  return (
    <div className="fixed bottom-0 w-full flex border-t border-border py-4 bg-background">
      <div className="mx-auto">
        <Button onClick={() => router.push("/chat")}>Back to Chat</Button>
      </div>
    </div>
  );
}

export function SharedChatDisplay({
  chatSession,
  availableAssistants,
  isShared,
}: {
  chatSession: BackendChatSession | null;
  availableAssistants: Assistant[] | null;
  isShared?: boolean;
}) {
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    Prism.highlightAll();
    setIsReady(true);
  }, []);

  if (!chatSession) {
    return (
      <div className="min-h-full w-full">
        <div className="mx-auto w-fit pt-8">
          <Callout color="red" title="Shared Chat Not Found">
            Did not find a shared chat with the specified ID.
          </Callout>
        </div>

        <BackToEnmeddButton />
      </div>
    );
  }

  const currentAssistant = availableAssistants?.find(
    (assistant) => assistant.id === chatSession.assistant_id
  );

  const messages = buildLatestMessageChain(
    processRawChatHistory(chatSession.messages)
  );

  return (
    <div className="w-full overflow-y-auto">
      <div className="container">
        <div>
          <h1 className="text-2xl xl:text-3xl text-strong font-bold">
            {chatSession.description || `Chat ${chatSession.chat_session_id}`}
          </h1>
          <p className="pt-2">
            {humanReadableFormat(chatSession.time_created)}
          </p>
          <Divider />
        </div>

        {isReady ? (
          <div className="pb-16">
            {messages.map((message) => {
              if (message.type === "user") {
                return (
                  <HumanMessage
                    key={message.messageId}
                    content={message.message}
                    isShared={isShared}
                  />
                );
              } else {
                return (
                  <AIMessage
                    currentAssistant={currentAssistant!}
                    key={message.messageId}
                    messageId={message.messageId}
                    content={message.message}
                    assistantName={chatSession.assistant_name}
                    citedDocuments={getCitedDocumentsFromMessage(message)}
                    isComplete
                  />
                );
              }
            })}
          </div>
        ) : (
          <div className="pt-10">
            <ThreeDotsLoader />
          </div>
        )}
      </div>

      <BackToEnmeddButton />
    </div>
  );
}
