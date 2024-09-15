// For handling AI message `sequences` (ie. ai messages which are streamed in sequence as separate messags but are in reality one message)

import { Message } from "@/app/chat/interfaces";
import { DanswerDocument } from "@/lib/search/interfaces";

export function getConsecutiveAIMessagesAtEnd(
  messageHistory: Message[]
): Message[] {
  const aiMessages = [];
  for (let i = messageHistory.length - 1; i >= 0; i--) {
    if (messageHistory[i]?.type === "assistant") {
      aiMessages.unshift(messageHistory[i]);
    } else {
      break;
    }
  }
  return aiMessages;
}
export function getUniqueDocumentsFromAIMessages(
  messages: Message[]
): DanswerDocument[] {
  const uniqueDocumentsMap = new Map<string, DanswerDocument>();

  messages.forEach((message) => {
    if (message.documents) {
      message.documents.forEach((doc) => {
        const uniqueKey = `${doc.document_id}-${doc.chunk_ind}`;
        if (!uniqueDocumentsMap.has(uniqueKey)) {
          uniqueDocumentsMap.set(uniqueKey, doc);
        }
      });
    }
  });

  return Array.from(uniqueDocumentsMap.values());
}
