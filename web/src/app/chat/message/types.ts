import { Dispatch, SetStateAction } from "react";
import { Message } from "../interfaces";
import { Persona } from "@/app/admin/assistants/interfaces";
import { ChatState, FeedbackType, RegenerationState } from "../types";
import { LlmOverride } from "@/lib/hooks";

export type MessageHistoryProps = {
  completeMessageDetail: {
    sessionId: number | null;
    messageMap: Map<number, Message>;
  };
  submittedMessage: string;

  setCompleteMessageDetail: (
    value: SetStateAction<{
      sessionId: number | null;
      messageMap: Map<number, Message>;
    }>
  ) => void;

  onSubmit: ({
    messageIdToResend,
    messageOverride,
    queryOverride,
    forceSearch,
    isSeededChat,
    alternativeAssistantOverride,
  }: {
    messageIdToResend?: number;
    messageOverride?: string;
    queryOverride?: string;
    forceSearch?: boolean;
    isSeededChat?: boolean;
    alternativeAssistantOverride?: Persona | null;
  }) => Promise<any>;

  upsertToCompleteMessageMap: ({
    messages,
    completeMessageMapOverride,
    chatSessionId,
    replacementsMap,
    makeLatestChildMessage,
  }: {
    messages: Message[];
    completeMessageMapOverride?: Map<number, Message> | null;
    chatSessionId?: number;
    replacementsMap?: Map<number, number> | null;
    makeLatestChildMessage?: boolean;
  }) => any;
  setSelectedMessageForDocDisplay: (messageId: number | null) => void;
  setMessageAsLatest: (messageId: number) => void;
  selectedMessageForDocDisplay: number | null;
  messageHistory: Message[];
  isStreaming: boolean;
  setCurrentFeedback: Dispatch<SetStateAction<[FeedbackType, number] | null>>;

  liveAssistant: any; // Replace 'any' with the correct type
  availableAssistants: any[]; // Replace 'any[]' with the correct type
  toggleDocumentSelectionAspects: any; // Replace 'any' with the correct type
  selectedDocuments: any[]; // Replace 'any[]' with the correct type
  setPopup: (popup: any) => void; // Replace 'any' with the correct type
  retrievalEnabled: boolean;
  alternativeGeneratingAssistant: Persona;
  alternativeAssistant: Persona;
  selectedAssistant: Persona;
  currentPersona: Persona;
  isFetchingChatMessages: boolean;
  createRegenerator: (
    responseId: number,
    finalMessageIndex: number
  ) => (modelOverRide: LlmOverride) => Promise<void>;
  regenerationState: RegenerationState | null;
  chatState: ChatState;
};
