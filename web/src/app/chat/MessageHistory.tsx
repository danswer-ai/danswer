import { List, AutoSizer } from "react-virtualized";

import {
  forwardRef,
  SetStateAction,
  useRef,
  useEffect,
  Dispatch,
  useCallback,
  useState,
  MutableRefObject,
  useImperativeHandle,
} from "react";
import { Persona } from "../admin/assistants/interfaces";
import { Message } from "./interfaces";
import { AIMessage, HumanMessage } from "./message/Messages";
import { TEMP_USER_MESSAGE_ID } from "./ChatPage";
import { getCitedDocumentsFromMessage, personaIncludesRetrieval } from "./lib";

import { FeedbackType } from "./types";
import { StarterMessage } from "./StarterMessage";

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
  alternativeGeneratingAssistant: Persona;
  alternativeAssistant: Persona;
  selectedAssistant: Persona;
  currentPersona: Persona;
  isFetchingChatMessages: boolean;
};

export const MessageRenderer = forwardRef<
  {
    lastMessageRef: HTMLDivElement | null;
    endPaddingRef: HTMLDivElement | null;
    endDivRef: HTMLDivElement | null;
    chatSessionIdRef: number | null;
  },
  MessageRendererProps
>((props, ref) => {
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
    alternativeGeneratingAssistant,
    alternativeAssistant,
    currentPersona,
    selectedAssistant,
    isFetchingChatMessages,
  } = props;

  const lastMessageRef = useRef<HTMLDivElement>(null);
  const endPaddingRef = useRef<HTMLDivElement>(null);
  const endDivRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const chatSessionIdRef = useRef<number | null>(null);

  useImperativeHandle(ref, () => ({
    lastMessageRef: lastMessageRef.current,
    chatSessionIdRef: chatSessionIdRef.current,
    endPaddingRef: endPaddingRef.current,
    endDivRef: endDivRef.current,
  }));

  const sizeMap = useRef<{ [key: number]: number }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(0);

  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        setContainerHeight(containerRef.current.clientHeight);
      }
    };

    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);
  const getSize = useCallback((index: { index: number }) => {
    return sizeMap.current[index.index] || 50; // default size
  }, []);

  const setSize = useCallback((index: number, size: number) => {
    sizeMap.current = { ...sizeMap.current, [index]: size };
    listRef.current?.recomputeRowHeights(index);
  }, []);

  const rowRenderer = ({ index, key, style }: any) => (
    <div style={style} key={key}>
      <AutoSizer disableHeight>
        {({ width }: { width: number }) => (
          <div
            ref={(el) => {
              if (el && el.clientHeight !== sizeMap.current[index]) {
                setSize(index, el.clientHeight);
              }
            }}
          >
            <ChatMessage
              index={index}
              style={{ width }}
              data={{
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
              }}
            />
          </div>
        )}
      </AutoSizer>
    </div>
  );

  return (
    <div className="flex-1 w-full" ref={containerRef}>
      <AutoSizer>
        {({ width, height }: { width: number; height: number }) => (
          <List
            ref={listRef}
            height={height}
            rowCount={messageHistory.length}
            rowHeight={getSize}
            rowRenderer={rowRenderer}
            width={width}
            overscanRowCount={2}
          />
        )}
      </AutoSizer>
      {isStreaming &&
        messageHistory.length > 0 &&
        messageHistory[messageHistory.length - 1].type === "user" && (
          <div key={`${messageHistory.length}-${chatSessionIdRef.current}`}>
            <AIMessage
              currentPersona={liveAssistant}
              alternativeAssistant={
                alternativeGeneratingAssistant ?? alternativeAssistant
              }
              messageId={null}
              personaName={liveAssistant.name}
              content={
                <div
                  key={"Generating"}
                  className="mr-auto relative inline-block"
                >
                  <span className="text-sm loading-text">Thinking...</span>
                </div>
              }
            />
          </div>
        )}

      {currentPersona &&
        currentPersona.starter_messages &&
        currentPersona.starter_messages.length > 0 &&
        selectedAssistant &&
        messageHistory.length === 0 &&
        !isFetchingChatMessages && (
          <div
            className={`
                          mx-auto 
                          px-4 
                          w-searchbar-xs 
                          2xl:w-searchbar-sm 
                          3xl:w-searchbar 
                          grid 
                          gap-4 
                          grid-cols-1 
                          grid-rows-1 
                          mt-4 
                          md:grid-cols-2 
                          mb-6`}
          >
            {currentPersona.starter_messages.map((starterMessage, i) => (
              <div key={i} className="w-full">
                <StarterMessage
                  starterMessage={starterMessage}
                  onClick={() =>
                    onSubmit({
                      messageOverride: starterMessage.message,
                    })
                  }
                />
              </div>
            ))}
          </div>
        )}
      {/* Some padding at the bottom so the search bar has space at the bottom to not cover the last message*/}
      <div ref={endPaddingRef} className="h-[95px]" />
      <div ref={endDivRef} />
    </div>
  );
});
