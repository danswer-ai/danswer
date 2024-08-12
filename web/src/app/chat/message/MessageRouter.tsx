import { Persona } from "../../admin/assistants/interfaces";
import { AIMessage, HumanMessage } from "./Messages";
import { TEMP_USER_MESSAGE_ID } from "../ChatPage";
import { getCitedDocumentsFromMessage, personaIncludesRetrieval } from "../lib";

export const MessageRouter = ({
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
    createRegenerator,
    regenerationState,
    chatState,
  } = data;

  const message = messageHistory[index];
  const messageMap = completeMessageDetail.messageMap;
  const messageReactComponentKey = `${index}-${completeMessageDetail.sessionId}`;
  const parentMessage = message.parentMessageId
    ? messageMap.get(message.parentMessageId)
    : null;

  if (
    regenerationState?.regenerating &&
    index >= regenerationState.finalMessageIndex
  ) {
    return <></>;
  }

  if (message.type === "user") {
    return (
      <div style={style} key={messageReactComponentKey}>
        <HumanMessage
          chatState={chatState}
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
          chatState={chatState}
          regenerate={createRegenerator(parentMessage?.messageId!, index)}
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
