"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  BackendChatSession,
  BackendMessage,
  ChatFileType,
  ChatSessionSharedStatus,
  DocumentsResponse,
  FileDescriptor,
  ImageGenerationDisplay,
  Message,
  RetrievalType,
  StreamingError,
  ToolCallMetadata,
} from "./interfaces";
import { Assistant } from "../admin/assistants/interfaces";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import {
  buildChatUrl,
  buildLatestMessageChain,
  checkAnyAssistantHasSearch,
  createChatSession,
  getCitedDocumentsFromMessage,
  getHumanAndAIMessageFromMessageNumber,
  getLastSuccessfulMessageId,
  handleChatFeedback,
  nameChatSession,
  PacketType,
  assistantIncludesRetrieval,
  processRawChatHistory,
  removeMessage,
  sendMessage,
  setMessageAsLatest,
  updateParentChildren,
  uploadFilesForChat,
  useScrollonStream,
} from "./lib";
import { useContext, useEffect, useRef, useState } from "react";
import { usePopup } from "@/components/admin/connectors/Popup";
import { SEARCH_PARAM_NAMES, shouldSubmitOnLoad } from "./searchParams";
import { useDocumentSelection } from "./useDocumentSelection";
import { useFilters, useLlmOverride } from "@/lib/hooks";
import { computeAvailableFilters } from "@/lib/filters";
import { FeedbackType } from "./types";
import { DocumentSidebar } from "./documentSidebar/DocumentSidebar";
import { InitializingLoader } from "@/components/InitializingLoader";
import { FeedbackModal } from "./modal/FeedbackModal";
import { ShareChatSessionModal } from "./modal/ShareChatSessionModal";
import { ChatIntro } from "./ChatIntro";
import { AIMessage, HumanMessage } from "./message/Messages";
import { ThreeDots } from "react-loader-spinner";
import { StarterMessage } from "./StarterMessage";
import { AnswerPiecePacket, EnmeddDocument } from "@/lib/search/interfaces";
import { buildFilters } from "@/lib/search/utils";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import Dropzone from "react-dropzone";
import { checkLLMSupportsImageInput, getFinalLLM } from "@/lib/llm/utils";
import { ChatInputBar } from "./input/ChatInputBar";
import { ConfigurationModal } from "./modal/configuration/ConfigurationModal";
import { useChatContext } from "@/components/context/ChatContext";
import { v4 as uuidv4 } from "uuid";
import { orderAssistantsForUser } from "@/lib/assistants/orderAssistants";
import { ChatPopup } from "./ChatPopup";
import { ChatBanner } from "./ChatBanner";
import { SIDEBAR_WIDTH_CONST } from "@/lib/constants";

import ResizableSection from "@/components/resizable/ResizableSection";
import {
  CircleArrowDown,
  PanelLeftClose,
  PanelRightClose,
  Share,
} from "lucide-react";
import Image from "next/image";
import Logo from "../../../public/logo-brand.png";
import { Button } from "@/components/ui/button";
import { DynamicSidebar } from "@/components/DynamicSidebar";
import { AnimatePresence, motion } from "framer-motion";
import { ChatSidebar } from "./sessionSidebar/ChatSidebar";
import { Skeleton } from "@/components/ui/skeleton";
import TopBar from "@/components/TopBar";

const TEMP_USER_MESSAGE_ID = -1;
const TEMP_ASSISTANT_MESSAGE_ID = -2;
const SYSTEM_MESSAGE_ID = -3;

export function ChatPage({
  documentSidebarInitialWidth,
  defaultSelectedAssistantsId,
}: {
  documentSidebarInitialWidth?: number;
  defaultSelectedAssistantsId?: number;
}) {
  const [configModalActiveTab, setConfigModalActiveTab] = useState<
    string | null
  >(null);
  let {
    user,
    chatSessions,
    availableSources,
    availableDocumentSets,
    availableAssistants,
    llmProviders,
    folders,
    openedFolders,
  } = useChatContext();

  const filteredAssistants = orderAssistantsForUser(availableAssistants, user);

  const [selectedAssistant, setSelectedAssistant] = useState<Assistant | null>(
    null
  );
  const [alternativeGeneratingAssistant, setAlternativeGeneratingAssistant] =
    useState<Assistant | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const existingChatIdRaw = searchParams.get("chatId");
  const existingChatSessionId = existingChatIdRaw
    ? parseInt(existingChatIdRaw)
    : null;
  const selectedChatSession = chatSessions.find(
    (chatSession) => chatSession.id === existingChatSessionId
  );
  const chatSessionIdRef = useRef<number | null>(existingChatSessionId);

  const llmOverrideManager = useLlmOverride(selectedChatSession);

  const existingChatSessionAssistantId = selectedChatSession?.assistant_id;

  // used to track whether or not the initial "submit on load" has been performed
  // this only applies if `?submit-on-load=true` or `?submit-on-load=1` is in the URL
  // NOTE: this is required due to React strict mode, where all `useEffect` hooks
  // are run twice on initial load during development
  const submitOnLoadPerformed = useRef<boolean>(false);

  const { popup, setPopup } = usePopup();

  // fetch messages for the chat session
  const [isFetchingChatMessages, setIsFetchingChatMessages] = useState(
    existingChatSessionId !== null
  );

  // this is triggered every time the user switches which chat
  // session they are using
  useEffect(() => {
    const priorChatSessionId = chatSessionIdRef.current;
    chatSessionIdRef.current = existingChatSessionId;
    textAreaRef.current?.focus();

    // only clear things if we're going from one chat session to another
    const isChatSessionSwitch =
      chatSessionIdRef.current !== null &&
      existingChatSessionId !== priorChatSessionId;
    if (isChatSessionSwitch) {
      // de-select documents
      clearSelectedDocuments();

      // reset all filters
      filterManager.setSelectedDocumentSets([]);
      filterManager.setSelectedSources([]);
      filterManager.setSelectedTags([]);
      filterManager.setTimeRange(null);

      // reset LLM overrides (based on chat session!)
      llmOverrideManager.updateModelOverrideForChatSession(selectedChatSession);
      llmOverrideManager.setTemperature(null);

      // remove uploaded files
      setCurrentMessageFiles([]);

      // if switching from one chat to another, then need to scroll again
      // if we're creating a brand new chat, then don't need to scroll
      if (chatSessionIdRef.current !== null) {
        setHasPerformedInitialScroll(false);
      }

      if (isStreaming) {
        setIsCancelled(true);
      }
    }

    async function initialSessionFetch() {
      if (existingChatSessionId === null) {
        setIsFetchingChatMessages(false);
        if (defaultSelectedAssistantsId !== undefined) {
          setSelectedAssistants(
            filteredAssistants.find(
              (assistant) => assistant.id === defaultSelectedAssistantsId
            )
          );
        } else {
          setSelectedAssistants(undefined);
        }
        setCompleteMessageDetail({
          sessionId: null,
          messageMap: new Map(),
        });
        setChatSessionSharedStatus(ChatSessionSharedStatus.Private);

        // if we're supposed to submit on initial load, then do that here
        if (
          shouldSubmitOnLoad(searchParams) &&
          !submitOnLoadPerformed.current
        ) {
          submitOnLoadPerformed.current = true;
          await onSubmit();
        }
        return;
      }

      setIsFetchingChatMessages(true);
      const response = await fetch(
        `/api/chat/get-chat-session/${existingChatSessionId}`
      );

      const chatSession = (await response.json()) as BackendChatSession;

      setSelectedAssistants(
        filteredAssistants.find(
          (assistant) => assistant.id === chatSession.assistant_id
        )
      );

      const newMessageMap = processRawChatHistory(chatSession.messages);
      const newMessageHistory = buildLatestMessageChain(newMessageMap);
      // if the last message is an error, don't overwrite it
      if (messageHistory[messageHistory.length - 1]?.type !== "error") {
        setCompleteMessageDetail({
          sessionId: chatSession.chat_session_id,
          messageMap: newMessageMap,
        });

        const latestMessageId =
          newMessageHistory[newMessageHistory.length - 1]?.messageId;
        setSelectedMessageForDocDisplay(
          latestMessageId !== undefined ? latestMessageId : null
        );
      }

      setChatSessionSharedStatus(chatSession.shared_status);

      // go to bottom. If initial load, then do a scroll,
      // otherwise just appear at the bottom
      if (!hasPerformedInitialScroll) {
        clientScrollToBottom();
      } else if (isChatSessionSwitch) {
        clientScrollToBottom(true);
      }
      setIsFetchingChatMessages(false);

      // if this is a seeded chat, then kick off the AI message generation
      if (
        newMessageHistory.length === 1 &&
        !submitOnLoadPerformed.current &&
        searchParams.get(SEARCH_PARAM_NAMES.SEEDED) === "true"
      ) {
        submitOnLoadPerformed.current = true;
        const seededMessage = newMessageHistory[0].message;
        await onSubmit({
          isSeededChat: true,
          messageOverride: seededMessage,
        });
        // force re-name if the chat session doesn't have one
        if (!chatSession.description) {
          await nameChatSession(existingChatSessionId, seededMessage);
          router.refresh(); // need to refresh to update name on sidebar
        }
      }
    }

    initialSessionFetch();
  }, [existingChatSessionId]);

  const [usedSidebarWidth, setUsedSidebarWidth] = useState<number>(
    documentSidebarInitialWidth || parseInt(SIDEBAR_WIDTH_CONST)
  );

  const updateSidebarWidth = (newWidth: number) => {
    setUsedSidebarWidth(newWidth);
    if (sidebarElementRef.current && innerSidebarElementRef.current) {
      sidebarElementRef.current.style.transition = "";
      sidebarElementRef.current.style.width = `${newWidth}px`;
      innerSidebarElementRef.current.style.width = `${newWidth}px`;
    }
  };

  const [message, setMessage] = useState(
    searchParams.get(SEARCH_PARAM_NAMES.USER_MESSAGE) || ""
  );
  const [completeMessageDetail, setCompleteMessageDetail] = useState<{
    sessionId: number | null;
    messageMap: Map<number, Message>;
  }>({ sessionId: null, messageMap: new Map() });
  const upsertToCompleteMessageMap = ({
    messages,
    completeMessageMapOverride,
    chatSessionId,
    replacementsMap = null,
    makeLatestChildMessage = false,
  }: {
    messages: Message[];
    // if calling this function repeatedly with short delay, stay may not update in time
    // and result in weird behavipr
    completeMessageMapOverride?: Map<number, Message> | null;
    chatSessionId?: number;
    replacementsMap?: Map<number, number> | null;
    makeLatestChildMessage?: boolean;
  }) => {
    // deep copy
    const frozenCompleteMessageMap =
      completeMessageMapOverride || completeMessageDetail.messageMap;
    const newCompleteMessageMap = structuredClone(frozenCompleteMessageMap);
    if (newCompleteMessageMap.size === 0) {
      const systemMessageId = messages[0].parentMessageId || SYSTEM_MESSAGE_ID;
      const firstMessageId = messages[0].messageId;
      const dummySystemMessage: Message = {
        messageId: systemMessageId,
        message: "",
        type: "system",
        files: [],
        toolCalls: [],
        parentMessageId: null,
        childrenMessageIds: [firstMessageId],
        latestChildMessageId: firstMessageId,
      };
      newCompleteMessageMap.set(
        dummySystemMessage.messageId,
        dummySystemMessage
      );
      messages[0].parentMessageId = systemMessageId;
    }
    messages.forEach((message) => {
      const idToReplace = replacementsMap?.get(message.messageId);
      if (idToReplace) {
        removeMessage(idToReplace, newCompleteMessageMap);
      }

      // update childrenMessageIds for the parent
      if (
        !newCompleteMessageMap.has(message.messageId) &&
        message.parentMessageId !== null
      ) {
        updateParentChildren(message, newCompleteMessageMap, true);
      }
      newCompleteMessageMap.set(message.messageId, message);
    });

    // if specified, make these new message the latest of the current message chain
    if (makeLatestChildMessage) {
      const currentMessageChain = buildLatestMessageChain(
        frozenCompleteMessageMap
      );
      const latestMessage = currentMessageChain[currentMessageChain.length - 1];
      if (latestMessage) {
        newCompleteMessageMap.get(
          latestMessage.messageId
        )!.latestChildMessageId = messages[0].messageId;
      }
    }
    const newCompleteMessageDetail = {
      sessionId: chatSessionId || completeMessageDetail.sessionId,
      messageMap: newCompleteMessageMap,
    };
    setCompleteMessageDetail(newCompleteMessageDetail);
    return newCompleteMessageDetail;
  };

  const messageHistory = buildLatestMessageChain(
    completeMessageDetail.messageMap
  );
  const [isStreaming, setIsStreaming] = useState(false);

  // uploaded files
  const [currentMessageFiles, setCurrentMessageFiles] = useState<
    FileDescriptor[]
  >([]);

  // for document display
  // NOTE: -1 is a special designation that means the latest AI message
  const [selectedMessageForDocDisplay, setSelectedMessageForDocDisplay] =
    useState<number | null>(null);
  const { aiMessage } = selectedMessageForDocDisplay
    ? getHumanAndAIMessageFromMessageNumber(
        messageHistory,
        selectedMessageForDocDisplay
      )
    : { aiMessage: null };

  const [selectedAssistants, setSelectedAssistants] = useState<
    Assistant | undefined
  >(() => {
    if (existingChatSessionAssistantId !== undefined) {
      return filteredAssistants.find(
        (assistant) => assistant.id === existingChatSessionAssistantId
      );
    } else if (defaultSelectedAssistantsId !== undefined) {
      return filteredAssistants.find(
        (assistant) => assistant.id === defaultSelectedAssistantsId
      );
    } else {
      return undefined;
    }
  });
  const liveAssistant =
    selectedAssistants || filteredAssistants[0] || availableAssistants[0];

  const [chatSessionSharedStatus, setChatSessionSharedStatus] =
    useState<ChatSessionSharedStatus>(ChatSessionSharedStatus.Private);

  useEffect(() => {
    if (messageHistory.length === 0 && chatSessionIdRef.current === null) {
      setSelectedAssistants(
        filteredAssistants.find(
          (assistant) => assistant.id === defaultSelectedAssistantsId
        )
      );
    }
  }, [defaultSelectedAssistantsId]);

  const [
    selectedDocuments,
    toggleDocumentSelection,
    clearSelectedDocuments,
    selectedDocumentTokens,
  ] = useDocumentSelection();
  // just choose a conservative default, this will be updated in the
  // background on initial load / on assistant change
  const [maxTokens, setMaxTokens] = useState<number>(4096);

  // fetch # of allowed document tokens for the selected Assistant
  useEffect(() => {
    async function fetchMaxTokens() {
      const response = await fetch(
        `/api/chat/max-selected-document-tokens?assistant_id=${liveAssistant.id}`
      );
      if (response.ok) {
        const maxTokens = (await response.json()).max_tokens as number;
        setMaxTokens(maxTokens);
      }
    }

    fetchMaxTokens();
  }, [liveAssistant]);

  const filterManager = useFilters();
  const [finalAvailableSources, finalAvailableDocumentSets] =
    computeAvailableFilters({
      selectedAssistant,
      availableSources,
      availableDocumentSets,
    });

  const [currentFeedback, setCurrentFeedback] = useState<
    [FeedbackType, number] | null
  >(null);

  const [sharingModalVisible, setSharingModalVisible] =
    useState<boolean>(false);

  // state for cancelling streaming
  const [isCancelled, setIsCancelled] = useState(false);
  const [aboveHorizon, setAboveHorizon] = useState(false);

  const scrollableDivRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const endDivRef = useRef<HTMLDivElement>(null);
  const endPaddingRef = useRef<HTMLDivElement>(null);

  const previousHeight = useRef<number>(
    inputRef.current?.getBoundingClientRect().height!
  );
  const scrollDist = useRef<number>(0);

  const updateScrollTracking = () => {
    const scrollDistance =
      endDivRef?.current?.getBoundingClientRect()?.top! -
      inputRef?.current?.getBoundingClientRect()?.top!;
    scrollDist.current = scrollDistance;
    setAboveHorizon(scrollDist.current > 500);
  };

  scrollableDivRef?.current?.addEventListener("scroll", updateScrollTracking);

  const handleInputResize = () => {
    setTimeout(() => {
      if (inputRef.current && lastMessageRef.current) {
        let newHeight: number =
          inputRef.current?.getBoundingClientRect().height!;
        const heightDifference = newHeight - previousHeight.current;
        if (
          previousHeight.current &&
          heightDifference != 0 &&
          endPaddingRef.current &&
          scrollableDivRef &&
          scrollableDivRef.current
        ) {
          endPaddingRef.current.style.transition = "height 0.3s ease-out";
          endPaddingRef.current.style.height = `${Math.max(
            newHeight - 50,
            0
          )}px`;

          scrollableDivRef?.current.scrollBy({
            left: 0,
            top: Math.max(heightDifference, 0),
            behavior: "smooth",
          });
        }
        previousHeight.current = newHeight;
      }
    }, 100);
  };

  const clientScrollToBottom = (fast?: boolean) => {
    setTimeout(() => {
      if (fast) {
        endDivRef.current?.scrollIntoView();
      } else {
        endDivRef.current?.scrollIntoView({ behavior: "smooth" });
      }

      setHasPerformedInitialScroll(true);
    }, 50);
  };

  const isCancelledRef = useRef<boolean>(isCancelled); // scroll is cancelled
  useEffect(() => {
    isCancelledRef.current = isCancelled;
  }, [isCancelled]);

  const distance = 500; // distance that should "engage" the scroll
  const debounce = 100; // time for debouncing

  useScrollonStream({
    isStreaming,
    scrollableDivRef,
    scrollDist,
    endDivRef,
    distance,
    debounce,
  });

  const [hasPerformedInitialScroll, setHasPerformedInitialScroll] = useState(
    existingChatSessionId === null
  );

  // handle re-sizing of the text area
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    handleInputResize();
  }, [message]);

  // tracks scrolling
  useEffect(() => {
    updateScrollTracking();
  }, [messageHistory]);

  // used for resizing of the document sidebar
  const masterFlexboxRef = useRef<HTMLDivElement>(null);
  const [maxDocumentSidebarWidth, setMaxDocumentSidebarWidth] = useState<
    number | null
  >(null);

  const adjustDocumentSidebarWidth = () => {
    if (masterFlexboxRef.current && document.documentElement.clientWidth) {
      if (document.documentElement.clientWidth > 1700) {
        setMaxDocumentSidebarWidth(450);
      } else if (document.documentElement.clientWidth > 1420) {
        setMaxDocumentSidebarWidth(350);
      } else {
        setMaxDocumentSidebarWidth(300);
      }
    }
  };

  useEffect(() => {
    adjustDocumentSidebarWidth(); // Adjust the width on initial render
    window.addEventListener("resize", adjustDocumentSidebarWidth); // Add resize event listener

    return () => {
      window.removeEventListener("resize", adjustDocumentSidebarWidth); // Cleanup the event listener
    };
  }, []);

  if (!documentSidebarInitialWidth && maxDocumentSidebarWidth) {
    documentSidebarInitialWidth = Math.min(700, maxDocumentSidebarWidth);
  }

  class CurrentMessageFIFO {
    private stack: PacketType[] = [];
    isComplete: boolean = false;
    error: string | null = null;

    push(packetBunch: PacketType) {
      this.stack.push(packetBunch);
    }

    nextPacket(): PacketType | undefined {
      return this.stack.shift();
    }

    isEmpty(): boolean {
      return this.stack.length === 0;
    }
  }
  async function updateCurrentMessageFIFO(
    stack: CurrentMessageFIFO,
    params: any
  ) {
    try {
      for await (const packetBunch of sendMessage(params)) {
        for (const packet of packetBunch) {
          stack.push(packet);
        }

        if (isCancelledRef.current) {
          setIsCancelled(false);
          break;
        }
      }
    } catch (error) {
      stack.error = String(error);
    } finally {
      stack.isComplete = true;
    }
  }

  const resetInputBar = () => {
    setMessage("");
    setCurrentMessageFiles([]);
    if (endPaddingRef.current) {
      endPaddingRef.current.style.height = `95px`;
    }
  };

  const onSubmit = async ({
    messageIdToResend,
    messageOverride,
    queryOverride,
    forceSearch,
    isSeededChat,
    alternativeAssistant = null,
  }: {
    messageIdToResend?: number;
    messageOverride?: string;
    queryOverride?: string;
    forceSearch?: boolean;
    isSeededChat?: boolean;
    alternativeAssistant?: Assistant | null;
  } = {}) => {
    setAlternativeGeneratingAssistant(alternativeAssistant);

    clientScrollToBottom();
    let currChatSessionId: number;
    let isNewSession = chatSessionIdRef.current === null;
    const searchParamBasedChatSessionName =
      searchParams.get(SEARCH_PARAM_NAMES.TITLE) || null;

    if (isNewSession) {
      currChatSessionId = await createChatSession(
        liveAssistant?.id || 0,
        searchParamBasedChatSessionName
      );
    } else {
      currChatSessionId = chatSessionIdRef.current as number;
    }
    chatSessionIdRef.current = currChatSessionId;

    const messageToResend = messageHistory.find(
      (message) => message.messageId === messageIdToResend
    );

    const messageMap = completeMessageDetail.messageMap;
    const messageToResendParent =
      messageToResend?.parentMessageId !== null &&
      messageToResend?.parentMessageId !== undefined
        ? messageMap.get(messageToResend.parentMessageId)
        : null;
    const messageToResendIndex = messageToResend
      ? messageHistory.indexOf(messageToResend)
      : null;
    if (!messageToResend && messageIdToResend !== undefined) {
      setPopup({
        message:
          "Failed to re-send message - please refresh the page and try again.",
        type: "error",
      });
      return;
    }

    let currMessage = messageToResend ? messageToResend.message : message;
    if (messageOverride) {
      currMessage = messageOverride;
    }
    const currMessageHistory =
      messageToResendIndex !== null
        ? messageHistory.slice(0, messageToResendIndex)
        : messageHistory;
    let parentMessage =
      messageToResendParent ||
      (currMessageHistory.length > 0
        ? currMessageHistory[currMessageHistory.length - 1]
        : null) ||
      (messageMap.size === 1 ? Array.from(messageMap.values())[0] : null);

    // if we're resending, set the parent's child to null
    // we will use tempMessages until the regenerated message is complete
    const messageUpdates: Message[] = [
      {
        messageId: TEMP_USER_MESSAGE_ID,
        message: currMessage,
        type: "user",
        files: currentMessageFiles,
        toolCalls: [],
        parentMessageId: parentMessage?.messageId || null,
      },
    ];
    if (parentMessage) {
      messageUpdates.push({
        ...parentMessage,
        childrenMessageIds: (parentMessage.childrenMessageIds || []).concat([
          TEMP_USER_MESSAGE_ID,
        ]),
        latestChildMessageId: TEMP_USER_MESSAGE_ID,
      });
    }
    const { messageMap: frozenMessageMap, sessionId: frozenSessionId } =
      upsertToCompleteMessageMap({
        messages: messageUpdates,
        chatSessionId: currChatSessionId,
      });

    // on initial message send, we insert a dummy system message
    // set this as the parent here if no parent is set
    if (!parentMessage && frozenMessageMap.size === 2) {
      parentMessage = frozenMessageMap.get(SYSTEM_MESSAGE_ID) || null;
    }

    const currentAssistantId = alternativeAssistant
      ? alternativeAssistant.id
      : selectedAssistant?.id;

    resetInputBar();

    setIsStreaming(true);
    let answer = "";
    let query: string | null = null;
    let retrievalType: RetrievalType =
      selectedDocuments.length > 0
        ? RetrievalType.SelectedDocs
        : RetrievalType.None;
    let documents: EnmeddDocument[] = selectedDocuments;
    let aiMessageImages: FileDescriptor[] | null = null;
    let error: string | null = null;
    let finalMessage: BackendMessage | null = null;
    let toolCalls: ToolCallMetadata[] = [];

    try {
      const lastSuccessfulMessageId =
        getLastSuccessfulMessageId(currMessageHistory);

      const stack = new CurrentMessageFIFO();
      updateCurrentMessageFIFO(stack, {
        message: currMessage,
        alternateAssistantId: currentAssistantId,
        fileDescriptors: currentMessageFiles,
        parentMessageId: lastSuccessfulMessageId,
        chatSessionId: currChatSessionId,
        promptId: liveAssistant?.prompts[0]?.id || 0,
        filters: buildFilters(
          filterManager.selectedSources,
          filterManager.selectedDocumentSets,
          filterManager.timeRange,
          filterManager.selectedTags
        ),
        selectedDocumentIds: selectedDocuments
          .filter(
            (document) =>
              document.db_doc_id !== undefined && document.db_doc_id !== null
          )
          .map((document) => document.db_doc_id as number),
        queryOverride,
        forceSearch,

        modelProvider: llmOverrideManager.llmOverride.name || undefined,
        modelVersion:
          llmOverrideManager.llmOverride.modelName ||
          searchParams.get(SEARCH_PARAM_NAMES.MODEL_VERSION) ||
          undefined,
        temperature:
          llmOverrideManager.temperature ||
          parseFloat(searchParams.get(SEARCH_PARAM_NAMES.TEMPERATURE) || "") ||
          undefined,
        systemPromptOverride:
          searchParams.get(SEARCH_PARAM_NAMES.SYSTEM_PROMPT) || undefined,
        useExistingUserMessage: isSeededChat,
      });
      const updateFn = (messages: Message[]) => {
        const replacementsMap = finalMessage
          ? new Map([
              [messages[0].messageId, TEMP_USER_MESSAGE_ID],
              [messages[1].messageId, TEMP_ASSISTANT_MESSAGE_ID],
            ] as [number, number][])
          : null;
        upsertToCompleteMessageMap({
          messages: messages,
          replacementsMap: replacementsMap,
          completeMessageMapOverride: frozenMessageMap,
          chatSessionId: frozenSessionId!,
        });
      };
      const delay = (ms: number) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
      };

      await delay(50);
      while (!stack.isComplete || !stack.isEmpty()) {
        await delay(2);

        if (!stack.isEmpty()) {
          const packet = stack.nextPacket();

          if (packet) {
            if (Object.hasOwn(packet, "answer_piece")) {
              answer += (packet as AnswerPiecePacket).answer_piece;
            } else if (Object.hasOwn(packet, "top_documents")) {
              documents = (packet as DocumentsResponse).top_documents;
              query = (packet as DocumentsResponse).rephrased_query;
              retrievalType = RetrievalType.Search;
              if (documents && documents.length > 0) {
                // point to the latest message (we don't know the messageId yet, which is why
                // we have to use -1)
                setSelectedMessageForDocDisplay(TEMP_USER_MESSAGE_ID);
              }
            } else if (Object.hasOwn(packet, "tool_name")) {
              toolCalls = [
                {
                  tool_name: (packet as ToolCallMetadata).tool_name,
                  tool_args: (packet as ToolCallMetadata).tool_args,
                  tool_result: (packet as ToolCallMetadata).tool_result,
                },
              ];
            } else if (Object.hasOwn(packet, "file_ids")) {
              aiMessageImages = (packet as ImageGenerationDisplay).file_ids.map(
                (fileId) => {
                  return {
                    id: fileId,
                    type: ChatFileType.IMAGE,
                  };
                }
              );
            } else if (Object.hasOwn(packet, "error")) {
              error = (packet as StreamingError).error;
            } else if (Object.hasOwn(packet, "message_id")) {
              finalMessage = packet as BackendMessage;
            }

            const newUserMessageId =
              finalMessage?.parent_message || TEMP_USER_MESSAGE_ID;
            const newAssistantMessageId =
              finalMessage?.message_id || TEMP_ASSISTANT_MESSAGE_ID;
            updateFn([
              {
                messageId: newUserMessageId,
                message: currMessage,
                type: "user",
                files: currentMessageFiles,
                toolCalls: [],
                parentMessageId: parentMessage?.messageId || null,
                childrenMessageIds: [newAssistantMessageId],
                latestChildMessageId: newAssistantMessageId,
              },
              {
                messageId: newAssistantMessageId,
                message: error || answer,
                type: error ? "error" : "assistant",
                retrievalType,
                query: finalMessage?.rephrased_query || query,
                documents:
                  finalMessage?.context_docs?.top_documents || documents,
                citations: finalMessage?.citations || {},
                files: finalMessage?.files || aiMessageImages || [],
                toolCalls: finalMessage?.tool_calls || toolCalls,
                parentMessageId: newUserMessageId,
                alternateAssistantID: selectedAssistant?.id,
              },
            ]);
          }
          if (isCancelledRef.current) {
            setIsCancelled(false);
            break;
          }
        }
      }
    } catch (e: any) {
      const errorMsg = e.message;
      upsertToCompleteMessageMap({
        messages: [
          {
            messageId: TEMP_USER_MESSAGE_ID,
            message: currMessage,
            type: "user",
            files: currentMessageFiles,
            toolCalls: [],
            parentMessageId: parentMessage?.messageId || SYSTEM_MESSAGE_ID,
          },
          {
            messageId: TEMP_ASSISTANT_MESSAGE_ID,
            message: errorMsg,
            type: "error",
            files: aiMessageImages || [],
            toolCalls: [],
            parentMessageId: TEMP_USER_MESSAGE_ID,
          },
        ],
        completeMessageMapOverride: frozenMessageMap,
      });
    }
    setIsStreaming(false);
    if (isNewSession) {
      if (finalMessage) {
        setSelectedMessageForDocDisplay(finalMessage.message_id);
      }
      if (!searchParamBasedChatSessionName) {
        await nameChatSession(currChatSessionId, currMessage);
      }

      // NOTE: don't switch pages if the user has navigated away from the chat
      if (
        currChatSessionId === chatSessionIdRef.current ||
        chatSessionIdRef.current === null
      ) {
        const newUrl = buildChatUrl(searchParams, currChatSessionId, null);
        // newUrl is like /chat?chatId=10
        // current page is like /chat
        router.push(newUrl, { scroll: false });
      }
    }
    if (
      finalMessage?.context_docs &&
      finalMessage.context_docs.top_documents.length > 0 &&
      retrievalType === RetrievalType.Search
    ) {
      setSelectedMessageForDocDisplay(finalMessage.message_id);
    }
    setAlternativeGeneratingAssistant(null);
  };

  const onFeedback = async (
    messageId: number,
    feedbackType: FeedbackType,
    feedbackDetails: string,
    predefinedFeedback: string | undefined
  ) => {
    if (chatSessionIdRef.current === null) {
      return;
    }

    const response = await handleChatFeedback(
      messageId,
      feedbackType,
      feedbackDetails,
      predefinedFeedback
    );

    if (response.ok) {
      setPopup({
        message: "Thanks for your feedback!",
        type: "success",
      });
    } else {
      const responseJson = await response.json();
      const errorMsg = responseJson.detail || responseJson.message;
      setPopup({
        message: `Failed to submit feedback - ${errorMsg}`,
        type: "error",
      });
    }
  };

  const onAssistantChange = (assistant: Assistant | null) => {
    if (assistant && assistant.id !== liveAssistant.id) {
      // remove uploaded files
      setCurrentMessageFiles([]);
      setSelectedAssistants(assistant);
      textAreaRef.current?.focus();
      router.push(buildChatUrl(searchParams, null, assistant.id));
    }
  };

  const handleImageUpload = (acceptedFiles: File[]) => {
    const llmAcceptsImages = checkLLMSupportsImageInput(
      ...getFinalLLM(
        llmProviders,
        liveAssistant,
        llmOverrideManager.llmOverride
      )
    );
    const imageFiles = acceptedFiles.filter((file) =>
      file.type.startsWith("image/")
    );
    if (imageFiles.length > 0 && !llmAcceptsImages) {
      setPopup({
        type: "error",
        message:
          "The current Assistant does not support image input. Please select an assistant with Vision support.",
      });
      return;
    }

    const tempFileDescriptors = acceptedFiles.map((file) => ({
      id: uuidv4(),
      type: file.type.startsWith("image/")
        ? ChatFileType.IMAGE
        : ChatFileType.DOCUMENT,
      isUploading: true,
    }));

    // only show loading spinner for reasonably large files
    const totalSize = acceptedFiles.reduce((sum, file) => sum + file.size, 0);
    if (totalSize > 50 * 1024) {
      setCurrentMessageFiles((prev) => [...prev, ...tempFileDescriptors]);
    }

    const removeTempFiles = (prev: FileDescriptor[]) => {
      return prev.filter(
        (file) => !tempFileDescriptors.some((newFile) => newFile.id === file.id)
      );
    };

    uploadFilesForChat(acceptedFiles).then(([files, error]) => {
      if (error) {
        setCurrentMessageFiles((prev) => removeTempFiles(prev));
        setPopup({
          type: "error",
          message: error,
        });
      } else {
        setCurrentMessageFiles((prev) => [...removeTempFiles(prev), ...files]);
      }
    });
  };

  // handle redirect if chat page is disabled
  // NOTE: this must be done here, in a client component since
  // settings are passed in via Context and therefore aren't
  // available in server-side components
  const settings = useContext(SettingsContext);
  if (settings?.settings?.chat_page_enabled === false) {
    router.push("/search");
  }

  const [showDocSidebar, setShowDocSidebar] = useState(false);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsWide(window.innerWidth >= 1024);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const toggleSidebar = () => {
    if (sidebarElementRef.current) {
      sidebarElementRef.current.style.transition = "width 0.3s ease-in-out";

      sidebarElementRef.current.style.width = showDocSidebar ? "300px" : "0px";
    }

    setShowDocSidebar((showDocSidebar) => !showDocSidebar);
  };

  useEffect(() => {
    const includes = checkAnyAssistantHasSearch(
      messageHistory,
      availableAssistants,
      liveAssistant
    );
    setRetrievalEnabled(includes);
  }, [messageHistory, availableAssistants, liveAssistant]);

  const [retrievalEnabled, setRetrievalEnabled] = useState(() => {
    return checkAnyAssistantHasSearch(
      messageHistory,
      availableAssistants,
      liveAssistant
    );
  });
  const [editingRetrievalEnabled, setEditingRetrievalEnabled] = useState(false);
  const sidebarElementRef = useRef<HTMLDivElement>(null);
  const innerSidebarElementRef = useRef<HTMLDivElement>(null);

  const currentAssistant = selectedAssistant || liveAssistant;

  const updateSelectedAssistant = (newAssistant: Assistant | null) => {
    setSelectedAssistant(newAssistant);
    if (newAssistant) {
      setEditingRetrievalEnabled(assistantIncludesRetrieval(newAssistant));
    } else {
      setEditingRetrievalEnabled(false);
    }
  };

  const [openSidebar, setOpenSidebar] = useState(false);

  const toggleLeftSideBar = () => {
    setOpenSidebar((prevState) => !prevState);
  };

  return (
    <>
      {liveAssistant && (
        <TopBar toggleLeftSideBar={toggleLeftSideBar}>
          <div className="flex ml-auto gap-2 items-center">
            {chatSessionIdRef.current !== null && (
              <ShareChatSessionModal
                chatSessionId={chatSessionIdRef.current}
                existingSharedStatus={chatSessionSharedStatus}
                onShare={(shared) =>
                  setChatSessionSharedStatus(
                    shared
                      ? ChatSessionSharedStatus.Public
                      : ChatSessionSharedStatus.Private
                  )
                }
              >
                <div
                  onClick={() => setSharingModalVisible(true)}
                  className="h-10 w-10 hover:bg-light hover:text-accent-foreground inline-flex items-center gap-1.5 justify-center whitespace-nowrap rounded-regular text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Share size={20} />
                </div>
              </ShareChatSessionModal>
            )}

            {retrievalEnabled && showDocSidebar && (
              <Button onClick={toggleSidebar} variant="ghost" size="icon">
                <PanelLeftClose size={24} />
              </Button>
            )}
          </div>
        </TopBar>
      )}

      <HealthCheckBanner />
      <InstantSSRAutoRefresh />

      {/* ChatPopup is a custom popup that displays a admin-specified message on initial user visit. 
      Only used in the EE version of the app. */}
      <ChatPopup />

      <div className="relative flex overflow-x-hidden bg-background ault h-full">
        <DynamicSidebar
          user={user}
          openSidebar={openSidebar}
          toggleLeftSideBar={toggleLeftSideBar}
        >
          <ChatSidebar
            existingChats={chatSessions}
            currentChatSession={selectedChatSession}
            folders={folders}
            openedFolders={openedFolders}
            toggleSideBar={toggleLeftSideBar}
          />
        </DynamicSidebar>

        <div ref={masterFlexboxRef} className="flex w-full overflow-x-hidden">
          {popup}
          {currentFeedback && (
            <FeedbackModal
              feedbackType={currentFeedback[0]}
              onClose={() => setCurrentFeedback(null)}
              onSubmit={({ message, predefinedFeedback }) => {
                onFeedback(
                  currentFeedback[1],
                  currentFeedback[0],
                  message,
                  predefinedFeedback
                );
                setCurrentFeedback(null);
              }}
            />
          )}

          <ConfigurationModal
            chatSessionId={chatSessionIdRef.current!}
            activeTab={configModalActiveTab}
            setActiveTab={setConfigModalActiveTab}
            onClose={() => setConfigModalActiveTab(null)}
            filterManager={filterManager}
            availableAssistants={filteredAssistants}
            selectedAssistant={liveAssistant}
            setSelectedAssistant={onAssistantChange}
            llmProviders={llmProviders}
            llmOverrideManager={llmOverrideManager}
          />

          {documentSidebarInitialWidth !== undefined ? (
            <Dropzone onDrop={handleImageUpload} noClick>
              {({ getRootProps }) => (
                <>
                  <div
                    className={`w-full sm:relative flex flex-col lg:px-10 3xl:px-0 ${
                      !retrievalEnabled ? "" : ""
                    }
                      flex-auto transition-margin duration-300 
                      overflow-x-auto
                      `}
                    {...getRootProps()}
                  >
                    {/* <input {...getInputProps()} /> */}

                    <div
                      className={`w-full h-full flex flex-col overflow-y-auto overflow-x-hidden relative scroll-smooth flex-1`}
                      ref={scrollableDivRef}
                    >
                      {/* ChatBanner is a custom banner that displays a admin-specified message at 
                      the top of the chat page. Only used in the EE version of the app. */}
                      {/*  <ChatBanner /> */}

                      {messageHistory.length === 0 &&
                        !isFetchingChatMessages &&
                        !isStreaming && (
                          <ChatIntro
                            availableSources={finalAvailableSources}
                            liveAssistant={liveAssistant}
                          >
                            {currentAssistant &&
                              currentAssistant.starter_messages &&
                              currentAssistant.starter_messages.length > 0 &&
                              messageHistory.length === 0 &&
                              !isFetchingChatMessages && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 md:pt-8">
                                  {currentAssistant.starter_messages.map(
                                    (starterMessage, i) => (
                                      <div
                                        key={i}
                                        className={`w-full ${
                                          i > 1 ? "hidden md:flex" : ""
                                        }`}
                                      >
                                        <StarterMessage
                                          starterMessage={starterMessage}
                                          onClick={() =>
                                            onSubmit({
                                              messageOverride:
                                                starterMessage.message,
                                            })
                                          }
                                        />
                                      </div>
                                    )
                                  )}
                                </div>
                              )}
                          </ChatIntro>
                        )}

                      <div
                        className={`mt-4 pt-20 pb-10 md:pb-14 lg:py-16 px-5 2xl:px-0 max-w-full mx-auto 2xl:w-searchbar w-full ${
                          hasPerformedInitialScroll ? "" : " invisible"
                        } ${messageHistory.length === 0 ? "hidden" : "block"}`}
                      >
                        {messageHistory.map((message, i) => {
                          const messageMap = completeMessageDetail.messageMap;
                          const messageReactComponentKey = `${i}-${completeMessageDetail.sessionId}`;
                          if (message.type === "user") {
                            const parentMessage = message.parentMessageId
                              ? messageMap.get(message.parentMessageId)
                              : null;
                            return (
                              <div key={messageReactComponentKey}>
                                <HumanMessage
                                  user={user}
                                  content={message.message}
                                  files={message.files}
                                  messageId={message.messageId}
                                  otherMessagesCanSwitchTo={
                                    parentMessage?.childrenMessageIds || []
                                  }
                                  onEdit={(editedContent) => {
                                    const parentMessageId =
                                      message.parentMessageId!;
                                    const parentMessage =
                                      messageMap.get(parentMessageId)!;
                                    upsertToCompleteMessageMap({
                                      messages: [
                                        {
                                          ...parentMessage,
                                          latestChildMessageId: null,
                                        },
                                      ],
                                    });
                                    onSubmit({
                                      messageIdToResend:
                                        message.messageId || undefined,
                                      messageOverride: editedContent,
                                    });
                                  }}
                                  onMessageSelection={(messageId) => {
                                    const newCompleteMessageMap = new Map(
                                      messageMap
                                    );
                                    newCompleteMessageMap.get(
                                      message.parentMessageId!
                                    )!.latestChildMessageId = messageId;
                                    setCompleteMessageDetail({
                                      sessionId:
                                        completeMessageDetail.sessionId,
                                      messageMap: newCompleteMessageMap,
                                    });
                                    setSelectedMessageForDocDisplay(messageId);
                                    // set message as latest so we can edit this message
                                    // and so it sticks around on page reload
                                    setMessageAsLatest(messageId);
                                  }}
                                />
                              </div>
                            );
                          } else if (message.type === "assistant") {
                            const isShowingRetrieved =
                              (selectedMessageForDocDisplay !== null &&
                                selectedMessageForDocDisplay ===
                                  message.messageId) ||
                              (selectedMessageForDocDisplay ===
                                TEMP_USER_MESSAGE_ID &&
                                i === messageHistory.length - 1);

                            const previousMessage =
                              i !== 0 ? messageHistory[i - 1] : null;

                            const currentAlternativeAssistant =
                              message.alternateAssistantID != null
                                ? availableAssistants.find(
                                    (assistant) =>
                                      assistant.id ==
                                      message.alternateAssistantID
                                  )
                                : null;

                            return (
                              <div
                                key={messageReactComponentKey}
                                ref={
                                  i == messageHistory.length - 1
                                    ? lastMessageRef
                                    : null
                                }
                              >
                                <AIMessage
                                  currentAssistant={liveAssistant}
                                  alternativeAssistant={
                                    currentAlternativeAssistant
                                  }
                                  messageId={message.messageId}
                                  content={message.message}
                                  files={message.files}
                                  query={messageHistory[i]?.query || undefined}
                                  assistantName={liveAssistant.name}
                                  citedDocuments={getCitedDocumentsFromMessage(
                                    message
                                  )}
                                  toolCall={
                                    message.toolCalls && message.toolCalls[0]
                                  }
                                  isComplete={
                                    i !== messageHistory.length - 1 ||
                                    !isStreaming
                                  }
                                  hasDocs={
                                    (message.documents &&
                                      message.documents.length > 0) === true
                                  }
                                  handleFeedback={
                                    i === messageHistory.length - 1 &&
                                    isStreaming
                                      ? undefined
                                      : (feedbackType) =>
                                          setCurrentFeedback([
                                            feedbackType,
                                            message.messageId as number,
                                          ])
                                  }
                                  handleSearchQueryEdit={
                                    i === messageHistory.length - 1 &&
                                    !isStreaming
                                      ? (newQuery) => {
                                          if (!previousMessage) {
                                            setPopup({
                                              type: "error",
                                              message:
                                                "Cannot edit query of first message - please refresh the page and try again.",
                                            });
                                            return;
                                          }

                                          if (
                                            previousMessage.messageId === null
                                          ) {
                                            setPopup({
                                              type: "error",
                                              message:
                                                "Cannot edit query of a pending message - please wait a few seconds and try again.",
                                            });
                                            return;
                                          }
                                          onSubmit({
                                            messageIdToResend:
                                              previousMessage.messageId,
                                            queryOverride: newQuery,
                                            alternativeAssistant:
                                              currentAlternativeAssistant,
                                          });
                                        }
                                      : undefined
                                  }
                                  isCurrentlyShowingRetrieved={
                                    isShowingRetrieved
                                  }
                                  handleShowRetrieved={(messageNumber) => {
                                    if (isShowingRetrieved) {
                                      setSelectedMessageForDocDisplay(null);
                                    } else {
                                      if (messageNumber !== null) {
                                        setSelectedMessageForDocDisplay(
                                          messageNumber
                                        );
                                      } else {
                                        setSelectedMessageForDocDisplay(-1);
                                      }
                                    }
                                  }}
                                  handleForceSearch={() => {
                                    if (
                                      previousMessage &&
                                      previousMessage.messageId
                                    ) {
                                      onSubmit({
                                        messageIdToResend:
                                          previousMessage.messageId,
                                        forceSearch: true,
                                        alternativeAssistant:
                                          currentAlternativeAssistant,
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
                                      ? !assistantIncludesRetrieval(
                                          currentAlternativeAssistant!
                                        )
                                      : !retrievalEnabled
                                  }
                                  handleToggleSideBar={() => {
                                    isShowingRetrieved
                                      ? setShowDocSidebar(true)
                                      : setShowDocSidebar(false);

                                    if (sidebarElementRef.current) {
                                      sidebarElementRef.current.style.transition =
                                        "width 0.3s ease-in-out";
                                    }
                                  }}
                                />
                              </div>
                            );
                          } else {
                            return (
                              <div key={messageReactComponentKey}>
                                <AIMessage
                                  currentAssistant={liveAssistant}
                                  messageId={message.messageId}
                                  assistantName={liveAssistant.name}
                                  content={
                                    <p className="my-auto text-sm text-red-700">
                                      {message.message}
                                    </p>
                                  }
                                />
                              </div>
                            );
                          }
                        })}
                        {isStreaming &&
                          messageHistory.length > 0 &&
                          messageHistory[messageHistory.length - 1].type ===
                            "user" && (
                            <div
                              key={`${messageHistory.length}-${chatSessionIdRef.current}`}
                            >
                              <AIMessage
                                currentAssistant={liveAssistant}
                                alternativeAssistant={
                                  alternativeGeneratingAssistant ??
                                  selectedAssistant
                                }
                                messageId={null}
                                assistantName={liveAssistant.name}
                                content={
                                  <div className="my-auto text-sm flex flex-col gap-1">
                                    <Skeleton className="h-5 w-full" />
                                    <Skeleton className="h-5 w-full" />
                                  </div>
                                }
                              />
                            </div>
                          )}

                        {/* Some padding at the bottom so the search bar has space at the bottom to not cover the last message*/}

                        <div ref={endDivRef}></div>

                        <div ref={endDivRef} />
                      </div>
                    </div>

                    <div ref={inputRef} className="z-10 w-full">
                      {aboveHorizon && (
                        <CircleArrowDown
                          onClick={() => clientScrollToBottom(true)}
                          size={24}
                          className="absolute bottom-[calc(100%_+_16px)] left-1/2 -translate-x-1/2 pointer-events-auto !rounded-full cursor-pointer bg-background"
                        />
                      )}
                      <div className="w-full pb-4">
                        <ChatInputBar
                          onSetSelectedAssistant={(
                            alternativeAssistant: Assistant | null
                          ) => {
                            updateSelectedAssistant(alternativeAssistant);
                          }}
                          alternativeAssistant={selectedAssistant}
                          assistants={filteredAssistants}
                          message={message}
                          setMessage={setMessage}
                          onSubmit={onSubmit}
                          isStreaming={isStreaming}
                          setIsCancelled={setIsCancelled}
                          retrievalDisabled={
                            !assistantIncludesRetrieval(currentAssistant)
                          }
                          filterManager={filterManager}
                          llmOverrideManager={llmOverrideManager}
                          selectedAssistant={liveAssistant}
                          files={currentMessageFiles}
                          setFiles={setCurrentMessageFiles}
                          handleFileUpload={handleImageUpload}
                          setConfigModalActiveTab={setConfigModalActiveTab}
                          textAreaRef={textAreaRef}
                          activeTab={configModalActiveTab}
                        />
                      </div>
                    </div>
                  </div>

                  {retrievalEnabled || editingRetrievalEnabled ? (
                    <>
                      <AnimatePresence>
                        {!showDocSidebar && (
                          <motion.div
                            className={`fixed w-full h-full bg-background-inverted bg-opacity-20 inset-0 z-overlay 2xl:hidden`}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: !showDocSidebar ? 1 : 0 }}
                            exit={{ opacity: 0 }}
                            transition={{
                              duration: 0.2,
                              opacity: { delay: !showDocSidebar ? 0 : 0.3 },
                            }}
                            style={{
                              pointerEvents: !showDocSidebar ? "auto" : "none",
                            }}
                            onClick={toggleSidebar}
                          />
                        )}
                      </AnimatePresence>

                      <div
                        ref={sidebarElementRef}
                        className="fixed 2xl:relative top-0 right-0 z-overlay bg-background  flex-none overflow-y-hidden h-full"
                        style={{
                          width: !showDocSidebar
                            ? Math.max(350, usedSidebarWidth)
                            : 0,
                        }}
                      >
                        <ResizableSection
                          updateSidebarWidth={updateSidebarWidth}
                          intialWidth={usedSidebarWidth}
                          minWidth={350}
                          maxWidth={maxDocumentSidebarWidth || undefined}
                        >
                          <DocumentSidebar
                            initialWidth={showDocSidebar ? usedSidebarWidth : 0}
                            ref={innerSidebarElementRef}
                            closeSidebar={() => toggleSidebar()}
                            selectedMessage={aiMessage}
                            selectedDocuments={selectedDocuments}
                            toggleDocumentSelection={toggleDocumentSelection}
                            clearSelectedDocuments={clearSelectedDocuments}
                            selectedDocumentTokens={selectedDocumentTokens}
                            maxTokens={maxTokens}
                            isLoading={isFetchingChatMessages}
                            showDocSidebar={showDocSidebar}
                            isWide={isWide}
                          />
                        </ResizableSection>
                      </div>
                    </>
                  ) : // Another option is to use a div with the width set to the initial width, so that the
                  // chat section appears in the same place as before
                  // <div style={documentSidebarInitialWidth ? {width: documentSidebarInitialWidth} : {}}></div>
                  null}
                </>
              )}
            </Dropzone>
          ) : (
            <div className="flex flex-col h-full mx-auto">
              <div className="my-auto">
                <InitializingLoader />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
