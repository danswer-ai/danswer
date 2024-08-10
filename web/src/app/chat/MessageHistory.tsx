import AutoSizer from "react-virtualized-auto-sizer";

import {
  forwardRef,
  SetStateAction,
  useRef,
  useEffect,
  Dispatch,
  useCallback,
  useState,
} from "react";
import { Persona } from "../admin/assistants/interfaces";
import { Message } from "./interfaces";
import { AIMessage, HumanMessage } from "./message/Messages";
import { TEMP_USER_MESSAGE_ID } from "./ChatPage";
import { getCitedDocumentsFromMessage, personaIncludesRetrieval } from "./lib";
import { VariableSizeList as List } from "react-window";

import { FeedbackType } from "./types";

const ChatMessage = ({
  index,
  style,
  data,
}: {
  index: any;
  style: any;
  data: any;
}) => {
  const {
    messageHistory,
    completeMessageDetail,
    onSubmit,
    upsertToCompleteMessageMap,
    setSelectedMessageForDocDisplay,
    setMessageAsLatest,
    setCompleteMessageDetail,
    selectedMessageForDocDisplay,
    isStreaming,
    setCurrentFeedback,
    liveAssistant,
    availableAssistants,
    toggleDocumentSelectionAspects,
    selectedDocuments,
    setPopup,
    retrievalEnabled,
  } = data;

  const message = messageHistory[index];
  const messageMap = completeMessageDetail.messageMap;
  const messageReactComponentKey = `${index}-${completeMessageDetail.sessionId}`;

  if (message.type === "user") {
    const parentMessage = message.parentMessageId
      ? messageMap.get(message.parentMessageId)
      : null;
    return (
      <div style={style} key={messageReactComponentKey}>
        <HumanMessage
          content={message.message}
          files={message.files}
          messageId={message.messageId}
          otherMessagesCanSwitchTo={parentMessage?.childrenMessageIds || []}
          onEdit={(editedContent) => {
            const parentMessageId = message.parentMessageId!;
            const parentMessage = messageMap.get(parentMessageId)!;
            upsertToCompleteMessageMap({
              messages: [
                {
                  ...parentMessage,
                  latestChildMessageId: null,
                },
              ],
            });
            onSubmit({
              messageIdToResend: message.messageId || undefined,
              messageOverride: editedContent,
            });
          }}
          onMessageSelection={(messageId) => {
            const newCompleteMessageMap = new Map(messageMap);
            // newCompleteMessageMap.get(message.parentMessageId!).latestChildMessageId = messageId;
            setCompleteMessageDetail({
              sessionId: completeMessageDetail.sessionId,
              messageMap: newCompleteMessageMap,
            });
            setSelectedMessageForDocDisplay(messageId);
            setMessageAsLatest(messageId);
          }}
        />
      </div>
    );
  } else if (message.type === "assistant") {
    const isShowingRetrieved =
      (selectedMessageForDocDisplay !== null &&
        selectedMessageForDocDisplay === message.messageId) ||
      (selectedMessageForDocDisplay === TEMP_USER_MESSAGE_ID &&
        index === messageHistory.length - 1);
    const previousMessage = index !== 0 ? messageHistory[index - 1] : null;

    const currentAlternativeAssistant =
      message.alternateAssistantID != null
        ? availableAssistants.find(
            (persona: Persona) => persona.id == message.alternateAssistantID
          )
        : null;

    return (
      <div style={style} key={messageReactComponentKey}>
        <AIMessage
          isActive={messageHistory.length - 1 == index}
          selectedDocuments={selectedDocuments}
          toggleDocumentSelection={toggleDocumentSelectionAspects}
          docs={message.documents}
          currentPersona={liveAssistant}
          alternativeAssistant={currentAlternativeAssistant}
          messageId={message.messageId}
          content={message.message}
          files={message.files}
          query={messageHistory[index]?.query || undefined}
          personaName={liveAssistant.name}
          citedDocuments={getCitedDocumentsFromMessage(message)}
          toolCall={message.toolCalls && message.toolCalls[0]}
          isComplete={index !== messageHistory.length - 1 || !isStreaming}
          hasDocs={(message.documents && message.documents.length > 0) === true}
          handleFeedback={
            index === messageHistory.length - 1 && isStreaming
              ? undefined
              : (feedbackType) =>
                  setCurrentFeedback([
                    feedbackType,
                    message.messageId as number,
                  ])
          }
          handleSearchQueryEdit={
            index === messageHistory.length - 1 && !isStreaming
              ? (newQuery) => {
                  if (!previousMessage) {
                    setPopup({
                      type: "error",
                      message:
                        "Cannot edit query of first message - please refresh the page and try again.",
                    });
                    return;
                  }

                  if (previousMessage.messageId === null) {
                    setPopup({
                      type: "error",
                      message:
                        "Cannot edit query of a pending message - please wait a few seconds and try again.",
                    });
                    return;
                  }
                  onSubmit({
                    messageIdToResend: previousMessage.messageId,
                    queryOverride: newQuery,
                    alternativeAssistantOverride: currentAlternativeAssistant,
                  });
                }
              : undefined
          }
          isCurrentlyShowingRetrieved={isShowingRetrieved}
          handleShowRetrieved={(messageNumber) => {
            if (isShowingRetrieved) {
              setSelectedMessageForDocDisplay(null);
            } else {
              if (messageNumber !== null) {
                setSelectedMessageForDocDisplay(messageNumber);
              } else {
                setSelectedMessageForDocDisplay(-1);
              }
            }
          }}
          handleForceSearch={() => {
            if (previousMessage && previousMessage.messageId) {
              onSubmit({
                messageIdToResend: previousMessage.messageId,
                forceSearch: true,
                alternativeAssistantOverride: currentAlternativeAssistant,
              });
            } else {
              setPopup({
                type: "error",
                message:
                  "Failed to force search - please refresh the page and try again.",
              });
            }
          }}
          retrievalDisabled={
            currentAlternativeAssistant
              ? !personaIncludesRetrieval(currentAlternativeAssistant!)
              : !retrievalEnabled
          }
        />
      </div>
    );
  } else {
    return (
      <div style={style} key={messageReactComponentKey}>
        <AIMessage
          currentPersona={liveAssistant}
          messageId={message.messageId}
          personaName={liveAssistant.name}
          content={
            <p className="text-red-700 text-sm my-auto">{message.message}</p>
          }
        />
      </div>
    );
  }
};

type MessageRendererProps = {
  completeMessageDetail: {
    sessionId: number | null;
    messageMap: Map<number, Message>;
  };

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
};

export const MessageRenderer = forwardRef<HTMLDivElement, MessageRendererProps>(
  (props, lastMessageRef) => {
    const {
      completeMessageDetail,
      onSubmit,
      upsertToCompleteMessageMap,
      setSelectedMessageForDocDisplay,
      setMessageAsLatest,
      setCompleteMessageDetail,
      selectedMessageForDocDisplay,
      messageHistory,
      isStreaming,
      setCurrentFeedback,
      liveAssistant,
      availableAssistants,
      toggleDocumentSelectionAspects,
      selectedDocuments,
      setPopup,
      retrievalEnabled,
    } = props;

    const listRef = useRef<List>(null);
    const sizeMap = useRef<{ [key: number]: number }>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const [containerHeight, setContainerHeight] = useState(0);

    useEffect(() => {
      const updateHeight = () => {
        if (containerRef.current) {
          setContainerHeight(containerRef.current.offsetHeight);
        }
      };

      updateHeight();
      window.addEventListener("resize", updateHeight);
      return () => window.removeEventListener("resize", updateHeight);
    }, []);

    const setSize = useCallback((index: number, size: number) => {
      sizeMap.current = { ...sizeMap.current, [index]: size };
      listRef.current?.resetAfterIndex(index);
    }, []);

    const getSize = useCallback((index: number) => {
      return sizeMap.current[index] || 50; // default size
    }, []);

    return (
      <div className="h-full w-full">
        <AutoSizer>
          {({ height, width }) => (
            <List
              ref={listRef}
              height={height}
              itemCount={messageHistory.length}
              itemSize={getRowHeight}
              width={width}
            >
              {Row}
            </List>
          )}
        </AutoSizer>
      </div>
    );
  }
);
