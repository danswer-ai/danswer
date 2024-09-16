// This module handles AI message sequences - consecutive AI messages that are streamed
// separately but represent a single logical message. These utilities are used for
// processing and displaying such sequences in the chat interface.

import { Message } from "@/app/chat/interfaces";
import { DanswerDocument } from "@/lib/search/interfaces";

// Retrieves the consecutive AI messages at the end of the message history.
// This is useful for combining or processing the latest AI response sequence.
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

// Extracts unique documents from a sequence of AI messages.
// This is used to compile a comprehensive list of referenced documents
// across multiple parts of an AI response.
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
