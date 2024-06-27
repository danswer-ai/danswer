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
import { ChatSidebar } from "./sessionSidebar/ChatSidebar";
import { Persona } from "../admin/assistants/interfaces";
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
  personaIncludesRetrieval,
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
import { DanswerInitializingLoader } from "@/components/DanswerInitializingLoader";
import { FeedbackModal } from "./modal/FeedbackModal";
import { ShareChatSessionModal } from "./modal/ShareChatSessionModal";
import { ChatPersonaSelector } from "./ChatPersonaSelector";
import { FiArrowDown, FiShare2 } from "react-icons/fi";
import { ChatIntro } from "./ChatIntro";
import { AIMessage, HumanMessage } from "./message/Messages";
import { ThreeDots } from "react-loader-spinner";
import { StarterMessage } from "./StarterMessage";
import { AnswerPiecePacket, DanswerDocument } from "@/lib/search/interfaces";
import { buildFilters } from "@/lib/search/utils";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import Dropzone from "react-dropzone";
import { checkLLMSupportsImageInput, getFinalLLM } from "@/lib/llm/utils";
import { ChatInputBar } from "./input/ChatInputBar";
import { ConfigurationModal } from "./modal/configuration/ConfigurationModal";
import { useChatContext } from "@/components/context/ChatContext";
import { UserDropdown } from "@/components/UserDropdown";
import { v4 as uuidv4 } from "uuid";
import { orderAssistantsForUser } from "@/lib/assistants/orderAssistants";
import { ChatPopup } from "./ChatPopup";
import { ChatBanner } from "./ChatBanner";
import { TbLayoutSidebarRightExpand } from "react-icons/tb";
import { SIDEBAR_WIDTH_CONST } from "@/lib/constants";

import ResizableSection from "@/components/resizable/ResizableSection";

const TEMP_USER_MESSAGE_ID = -1;
const TEMP_ASSISTANT_MESSAGE_ID = -2;
const SYSTEM_MESSAGE_ID = -3;

export function ChatPage({
  documentSidebarInitialWidth,
  defaultSelectedPersonaId,
}: {
  documentSidebarInitialWidth?: number;
  defaultSelectedPersonaId?: number;
}) {
  const [configModalActiveTab, setConfigModalActiveTab] = useState<
    string | null
  >(null);
  let {
    user,
    chatSessions,
    availableSources,
    availableDocumentSets,
    availablePersonas,
    llmProviders,
    folders,
    openedFolders,
  } = useChatContext();

  const filteredAssistants = orderAssistantsForUser(availablePersonas, user);

  const [selectedAssistant, setSelectedAssistant] = useState<Persona | null>(
    null
  );
  const [alternativeGeneratingAssistant, setAlternativeGeneratingAssistant] =
    useState<Persona | null>(null);

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

  const existingChatSessionPersonaId = selectedChatSession?.persona_id;

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
        if (defaultSelectedPersonaId !== undefined) {
          setSelectedPersona(
            filteredAssistants.find(
              (persona) => persona.id === defaultSelectedPersonaId
            )
          );
        } else {
          setSelectedPersona(undefined);
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

      setSelectedPersona(
        filteredAssistants.find(
          (persona) => persona.id === chatSession.persona_id
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

  const [selectedPersona, setSelectedPersona] = useState<Persona | undefined>(
    existingChatSessionPersonaId !== undefined
      ? filteredAssistants.find(
          (persona) => persona.id === existingChatSessionPersonaId
        )
      : defaultSelectedPersonaId !== undefined
        ? filteredAssistants.find(
            (persona) => persona.id === defaultSelectedPersonaId
          )
        : undefined
  );
  const livePersona =
    selectedPersona || filteredAssistants[0] || availablePersonas[0];

  const [chatSessionSharedStatus, setChatSessionSharedStatus] =
    useState<ChatSessionSharedStatus>(ChatSessionSharedStatus.Private);

  useEffect(() => {
    if (messageHistory.length === 0 && chatSessionIdRef.current === null) {
      setSelectedPersona(
        filteredAssistants.find(
          (persona) => persona.id === defaultSelectedPersonaId
        )
      );
    }
  }, [defaultSelectedPersonaId]);

  const [
    selectedDocuments,
    toggleDocumentSelection,
    clearSelectedDocuments,
    selectedDocumentTokens,
  ] = useDocumentSelection();
  // just choose a conservative default, this will be updated in the
  // background on initial load / on persona change
  const [maxTokens, setMaxTokens] = useState<number>(4096);

  // fetch # of allowed document tokens for the selected Persona
  useEffect(() => {
    async function fetchMaxTokens() {
      const response = await fetch(
        `/api/chat/max-selected-document-tokens?persona_id=${livePersona.id}`
      );
      if (response.ok) {
        const maxTokens = (await response.json()).max_tokens as number;
        setMaxTokens(maxTokens);
      }
    }

    fetchMaxTokens();
  }, [livePersona]);

  const filterManager = useFilters();
  const [finalAvailableSources, finalAvailableDocumentSets] =
    computeAvailableFilters({
      selectedPersona,
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
      // numbers below are based on the actual width the center section for different
      // screen sizes. `1700` corresponds to the custom "3xl" tailwind breakpoint
      // NOTE: some buffer is needed to account for scroll bars
      if (document.documentElement.clientWidth > 1700) {
        setMaxDocumentSidebarWidth(masterFlexboxRef.current.clientWidth - 950);
      } else if (document.documentElement.clientWidth > 1420) {
        setMaxDocumentSidebarWidth(masterFlexboxRef.current.clientWidth - 760);
      } else {
        setMaxDocumentSidebarWidth(masterFlexboxRef.current.clientWidth - 660);
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
    alternativeAssistant?: Persona | null;
  } = {}) => {
    setAlternativeGeneratingAssistant(alternativeAssistant);

    clientScrollToBottom();
    let currChatSessionId: number;
    let isNewSession = chatSessionIdRef.current === null;
    const searchParamBasedChatSessionName =
      searchParams.get(SEARCH_PARAM_NAMES.TITLE) || null;

    if (isNewSession) {
      currChatSessionId = await createChatSession(
        livePersona?.id || 0,
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
    let documents: DanswerDocument[] = selectedDocuments;
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
        promptId: livePersona?.prompts[0]?.id || 0,
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

  const onPersonaChange = (persona: Persona | null) => {
    if (persona && persona.id !== livePersona.id) {
      // remove uploaded files
      setCurrentMessageFiles([]);
      setSelectedPersona(persona);
      textAreaRef.current?.focus();
      router.push(buildChatUrl(searchParams, null, persona.id));
    }
  };

  const handleImageUpload = (acceptedFiles: File[]) => {
    const llmAcceptsImages = checkLLMSupportsImageInput(
      ...getFinalLLM(llmProviders, livePersona, llmOverrideManager.llmOverride)
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

  const [showDocSidebar, setShowDocSidebar] = useState(true); // State to track if sidebar is open

  const toggleSidebar = () => {
    if (sidebarElementRef.current) {
      sidebarElementRef.current.style.transition = "width 0.3s ease-in-out";

      sidebarElementRef.current.style.width = showDocSidebar
        ? "0px"
        : `${usedSidebarWidth}px`;
    }

    setShowDocSidebar((showDocSidebar) => !showDocSidebar); // Toggle the state which will in turn toggle the class
  };

  useEffect(() => {
    const includes = checkAnyAssistantHasSearch(
      messageHistory,
      availablePersonas,
      livePersona
    );
    setRetrievalEnabled(includes);
  }, [messageHistory, availablePersonas, livePersona]);

  const [retrievalEnabled, setRetrievalEnabled] = useState(() => {
    return checkAnyAssistantHasSearch(
      messageHistory,
      availablePersonas,
      livePersona
    );
  });
  const [editingRetrievalEnabled, setEditingRetrievalEnabled] = useState(false);
  const sidebarElementRef = useRef<HTMLDivElement>(null);
  const innerSidebarElementRef = useRef<HTMLDivElement>(null);

  const currentPersona = selectedAssistant || livePersona;

  const updateSelectedAssistant = (newAssistant: Persona | null) => {
    setSelectedAssistant(newAssistant);
    if (newAssistant) {
      setEditingRetrievalEnabled(personaIncludesRetrieval(newAssistant));
    } else {
      setEditingRetrievalEnabled(false);
    }
  };
  console.log(hasPerformedInitialScroll);
  return (
    <>
      <HealthCheckBanner />
      <InstantSSRAutoRefresh />

      {/* ChatPopup is a custom popup that displays a admin-specified message on initial user visit. 
      Only used in the EE version of the app. */}
      <ChatPopup />

      <div className="flex relative bg-background text-default overflow-x-hidden">
        <ChatSidebar
          existingChats={chatSessions}
          currentChatSession={selectedChatSession}
          folders={folders}
          openedFolders={openedFolders}
        />

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

          {sharingModalVisible && chatSessionIdRef.current !== null && (
            <ShareChatSessionModal
              chatSessionId={chatSessionIdRef.current}
              existingSharedStatus={chatSessionSharedStatus}
              onClose={() => setSharingModalVisible(false)}
              onShare={(shared) =>
                setChatSessionSharedStatus(
                  shared
                    ? ChatSessionSharedStatus.Public
                    : ChatSessionSharedStatus.Private
                )
              }
            />
          )}

          <ConfigurationModal
            chatSessionId={chatSessionIdRef.current!}
            activeTab={configModalActiveTab}
            setActiveTab={setConfigModalActiveTab}
            onClose={() => setConfigModalActiveTab(null)}
            filterManager={filterManager}
            availableAssistants={filteredAssistants}
            selectedAssistant={livePersona}
            setSelectedAssistant={onPersonaChange}
            llmProviders={llmProviders}
            llmOverrideManager={llmOverrideManager}
          />

          {documentSidebarInitialWidth !== undefined ? (
            <Dropzone onDrop={handleImageUpload} noClick>
              {({ getRootProps }) => (
                <>
                  <div
                    className={`w-full sm:relative h-screen ${
                      !retrievalEnabled ? "pb-[111px]" : "pb-[140px]"
                    }
                      flex-auto transition-margin duration-300 
                      overflow-x-auto
                      `}
                    {...getRootProps()}
                  >
                    {/* <input {...getInputProps()} /> */}

                    <div
                      className={`w-full h-full flex flex-col overflow-y-auto overflow-x-hidden relative`}
                      ref={scrollableDivRef}
                    >
                      {/* ChatBanner is a custom banner that displays a admin-specified message at 
                      the top of the chat page. Only used in the EE version of the app. */}
                      <ChatBanner />

                      {livePersona && (
                        <div className="sticky top-0 left-80 z-10 w-full bg-background flex">
                          <div className="mt-2 flex w-full">
                            <div className="ml-2 p-1 rounded w-fit">
                              <ChatPersonaSelector
                                personas={filteredAssistants}
                                selectedPersonaId={livePersona.id}
                                onPersonaChange={onPersonaChange}
                                userId={user?.id}
                              />
                            </div>

                            <div className="ml-auto mr-6 flex">
                              {chatSessionIdRef.current !== null && (
                                <div
                                  onClick={() => setSharingModalVisible(true)}
                                  className={`
                                    my-auto
                                    p-2
                                    rounded
                                    cursor-pointer
                                    hover:bg-hover-light
                                  `}
                                >
                                  <FiShare2 size="18" />
                                </div>
                              )}

                              <div className="ml-4 flex my-auto">
                                <UserDropdown user={user} />
                                {retrievalEnabled && !showDocSidebar && (
                                  <button
                                    className="ml-4 mt-auto"
                                    onClick={() => toggleSidebar()}
                                  >
                                    <TbLayoutSidebarRightExpand size={24} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {messageHistory.length === 0 &&
                        !isFetchingChatMessages &&
                        !isStreaming && (
                          <ChatIntro
                            availableSources={finalAvailableSources}
                            selectedPersona={livePersona}
                          />
                        )}

                      <div
                        className={
                          "mt-4 pt-12 sm:pt-0 mx-8" +
                          (hasPerformedInitialScroll ? "" : " invisible")
                        }
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
                                ? availablePersonas.find(
                                    (persona) =>
                                      persona.id == message.alternateAssistantID
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
                                  currentPersona={livePersona}
                                  alternativeAssistant={
                                    currentAlternativeAssistant
                                  }
                                  messageId={message.messageId}
                                  content={message.message}
                                  files={message.files}
                                  query={messageHistory[i]?.query || undefined}
                                  personaName={livePersona.name}
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
                                      ? !personaIncludesRetrieval(
                                          currentAlternativeAssistant!
                                        )
                                      : !retrievalEnabled
                                  }
                                />
                              </div>
                            );
                          } else {
                            return (
                              <div key={messageReactComponentKey}>
                                <AIMessage
                                  currentPersona={livePersona}
                                  messageId={message.messageId}
                                  personaName={livePersona.name}
                                  content={
                                    <p className="text-red-700 text-sm my-auto">
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
                                currentPersona={livePersona}
                                alternativeAssistant={
                                  alternativeGeneratingAssistant ??
                                  selectedAssistant
                                }
                                messageId={null}
                                personaName={livePersona.name}
                                content={
                                  <div className="text-sm my-auto">
                                    <ThreeDots
                                      height="30"
                                      width="50"
                                      color="#3b82f6"
                                      ariaLabel="grid-loading"
                                      radius="12.5"
                                      wrapperStyle={{}}
                                      wrapperClass=""
                                      visible={true}
                                    />
                                  </div>
                                }
                              />
                            </div>
                          )}

                        {/* Some padding at the bottom so the search bar has space at the bottom to not cover the last message*/}
                        <div ref={endPaddingRef} className=" h-[95px]" />
                        <div ref={endDivRef}></div>

                        {currentPersona &&
                          currentPersona.starter_messages &&
                          currentPersona.starter_messages.length > 0 &&
                          selectedPersona &&
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
                              {currentPersona.starter_messages.map(
                                (starterMessage, i) => (
                                  <div key={i} className="w-full">
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
                        <div ref={endDivRef} />
                      </div>
                    </div>

                    <div
                      ref={inputRef}
                      className="absolute bottom-0 z-10 w-full"
                    >
                      <div className="w-full relative pb-4">
                        {aboveHorizon && (
                          <div className="pointer-events-none w-full bg-transparent flex sticky justify-center">
                            <button
                              onClick={() => clientScrollToBottom(true)}
                              className="p-1 pointer-events-auto rounded-2xl bg-background-strong border border-border mb-2 mx-auto "
                            >
                              <FiArrowDown size={18} />
                            </button>
                          </div>
                        )}

                        <ChatInputBar
                          onSetSelectedAssistant={(
                            alternativeAssistant: Persona | null
                          ) => {
                            updateSelectedAssistant(alternativeAssistant);
                          }}
                          alternativeAssistant={selectedAssistant}
                          personas={filteredAssistants}
                          message={message}
                          setMessage={setMessage}
                          onSubmit={onSubmit}
                          isStreaming={isStreaming}
                          setIsCancelled={setIsCancelled}
                          retrievalDisabled={
                            !personaIncludesRetrieval(currentPersona)
                          }
                          filterManager={filterManager}
                          llmOverrideManager={llmOverrideManager}
                          selectedAssistant={livePersona}
                          files={currentMessageFiles}
                          setFiles={setCurrentMessageFiles}
                          handleFileUpload={handleImageUpload}
                          setConfigModalActiveTab={setConfigModalActiveTab}
                          textAreaRef={textAreaRef}
                        />
                      </div>
                    </div>
                  </div>

                  {retrievalEnabled || editingRetrievalEnabled ? (
                    <div
                      ref={sidebarElementRef}
                      className={`relative flex-none  overflow-y-hidden sidebar bg-background-weak h-screen`}
                      style={{ width: showDocSidebar ? usedSidebarWidth : 0 }}
                    >
                      <ResizableSection
                        updateSidebarWidth={updateSidebarWidth}
                        intialWidth={usedSidebarWidth}
                        minWidth={300}
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
                        />
                      </ResizableSection>
                    </div>
                  ) : // Another option is to use a div with the width set to the initial width, so that the
                  // chat section appears in the same place as before
                  // <div style={documentSidebarInitialWidth ? {width: documentSidebarInitialWidth} : {}}></div>
                  null}
                </>
              )}
            </Dropzone>
          ) : (
            <div className="mx-auto h-full flex flex-col">
              <div className="my-auto">
                <DanswerInitializingLoader />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
