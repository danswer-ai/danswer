"use client";
import Prism from "prismjs";

import { humanReadableFormat } from "@/lib/time";
import { BackendChatSession } from "../../interfaces";
import {
  buildLatestMessageChain,
  getCitedDocumentsFromMessage,
  processRawChatHistory,
} from "../../lib";
import { AIMessage, HumanMessage } from "../../message/Messages";
import { Button, Callout, Divider } from "@tremor/react";
import { useRouter } from "next/navigation";
import { Persona } from "@/app/admin/assistants/interfaces";
import { useContext, useEffect, useState } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { DanswerInitializingLoader } from "@/components/DanswerInitializingLoader";

function BackToDanswerButton() {
  const router = useRouter();
  const enterpriseSettings = useContext(SettingsContext)?.enterpriseSettings;

  return (
    <div className="absolute bottom-4 w-full flex border-t border-border pt-4">
      <div className="mx-auto">
        <Button onClick={() => router.push("/chat")}>
          Back to {enterpriseSettings?.application_name || "Danswer Chat"}
        </Button>
      </div>
      pr
    </div>
  );
}

export function SharedChatDisplay({
  chatSession,
  availableAssistants,
}: {
  chatSession: BackendChatSession | null;
  availableAssistants: Persona[];
}) {
  if (!chatSession) {
    return (
      <div className="min-h-full w-full">
        <div className="mx-auto w-fit pt-8">
          <Callout color="red" title="Shared Chat Not Found">
            Did not find a shared chat with the specified ID.
          </Callout>
        </div>

        <BackToDanswerButton />
      </div>
    );
  }

  const currentPersona = availableAssistants.find(
    (persona) => persona.id === chatSession.persona_id
  );

  const messages = buildLatestMessageChain(
    processRawChatHistory(chatSession.messages)
  );
  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    Prism.highlightAll();
    setIsReady(true);
  }, []);

  return (
    <div className="w-full overflow-hidden">
      <div className="flex max-h-full overflow-hidden pb-[72px]">
        <div className="flex w-full overflow-hidden overflow-y-scroll">
          <div className="w-full max-w-message-max mx-auto">
            <div className="px-5 pt-8">
              <h1 className="text-3xl text-strong font-bold">
                {chatSession.description ||
                  `Chat ${chatSession.chat_session_id}`}
              </h1>
              <p className="text-emphasis">
                {humanReadableFormat(chatSession.time_created)}
              </p>

              <Divider />
            </div>
            {isReady ? (
              <div className="w-full pb-16">
                {messages.map((message) => {
                  if (message.type === "user") {
                    return (
                      <HumanMessage
                        shared
                        key={message.messageId}
                        content={message.message}
                        files={message.files}
                      />
                    );
                  } else {
                    return (
                      <AIMessage
                        shared
                        currentPersona={currentPersona!}
                        key={message.messageId}
                        messageId={message.messageId}
                        content={message.message}
                        files={message.files || []}
                        personaName={chatSession.persona_name}
                        citedDocuments={getCitedDocumentsFromMessage(message)}
                        isComplete
                      />
                    );
                  }
                })}
              </div>
            ) : (
              <div className="flex w-full">
                <DanswerInitializingLoader />
              </div>
            )}
          </div>
        </div>
      </div>

      <BackToDanswerButton />
    </div>
  );
}
