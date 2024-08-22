"use client";

import { useRouter, useSearchParams } from "next/navigation";
import {
  BackendChatSession,
  BackendMessage,
  ChatFileType,
  ChatSession,
  ChatSessionSharedStatus,
  DocumentsResponse,
  FileDescriptor,
  ImageGenerationDisplay,
  Message,
  MessageResponseIDInfo,
  RetrievalType,
  StreamingError,
  ToolCallMetadata,
} from "./interfaces";

import Prism from "prismjs";
import Cookies from "js-cookie";
import { HistorySidebar } from "./sessionSidebar/HistorySidebar";
import { Persona } from "../admin/assistants/interfaces";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  buildChatUrl,
  buildLatestMessageChain,
  checkAnyAssistantHasSearch,
  createChatSession,
  deleteChatSession,
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
import { LlmOverride, useFilters, useLlmOverride } from "@/lib/hooks";
import { computeAvailableFilters } from "@/lib/filters";
import { ChatState, FeedbackType } from "./types";
import { DocumentSidebar } from "./documentSidebar/DocumentSidebar";
import { DanswerInitializingLoader } from "@/components/DanswerInitializingLoader";
import { FeedbackModal } from "./modal/FeedbackModal";
import { ShareChatSessionModal } from "./modal/ShareChatSessionModal";
import { FiArrowDown } from "react-icons/fi";
import { ChatIntro } from "./ChatIntro";
import { AIMessage, HumanMessage } from "./message/Messages";
import { StarterMessage } from "./StarterMessage";
import { AnswerPiecePacket, DanswerDocument } from "@/lib/search/interfaces";
import { buildFilters } from "@/lib/search/utils";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import Dropzone from "react-dropzone";
import {
  checkLLMSupportsImageInput,
  getFinalLLM,
  destructureValue,
  getLLMProviderOverrideForPersona,
} from "@/lib/llm/utils";

import { ChatInputBar } from "./input/ChatInputBar";
import { useChatContext } from "@/components/context/ChatContext";
import { v4 as uuidv4 } from "uuid";
import { orderAssistantsForUser } from "@/lib/assistants/orderAssistants";
import { ChatPopup } from "./ChatPopup";

import FunctionalHeader from "@/components/chat_search/Header";
import { useSidebarVisibility } from "@/components/chat_search/hooks";
import { SIDEBAR_TOGGLED_COOKIE_NAME } from "@/components/resizable/constants";
import FixedLogo from "./shared_chat_search/FixedLogo";
import { getSecondsUntilExpiration } from "@/lib/time";
import { SetDefaultModelModal } from "./modal/SetDefaultModelModal";
import { DeleteChatModal } from "./modal/DeleteChatModal";
import { MinimalMarkdown } from "@/components/chat_search/MinimalMarkdown";
import ExceptionTraceModal from "@/components/modals/ExceptionTraceModal";

const TEMP_USER_MESSAGE_ID = -1;
const TEMP_ASSISTANT_MESSAGE_ID = -2;
const SYSTEM_MESSAGE_ID = -3;

export function ChatPage({
  toggle,
  documentSidebarInitialWidth,
  defaultSelectedAssistantId,
  toggledSidebar,
}: {
  toggle: (toggled?: boolean) => void;
  documentSidebarInitialWidth?: number;
  defaultSelectedAssistantId?: number;
  toggledSidebar: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  let {
    user,
    chatSessions,
    availableSources,
    availableDocumentSets,
    availableAssistants,
    llmProviders,
    folders,
    openedFolders,
    userInputPrompts,
  } = useChatContext();

  // chat session
  const existingChatIdRaw = searchParams.get("chatId");
  const currentPersonaId = searchParams.get(SEARCH_PARAM_NAMES.PERSONA_ID);

  const existingChatSessionId = existingChatIdRaw
    ? parseInt(existingChatIdRaw)
    : null;
  const selectedChatSession = chatSessions.find(
    (chatSession) => chatSession.id === existingChatSessionId
  );

  const chatSessionIdRef = useRef<number | null>(existingChatSessionId);

  // Only updates on session load (ie. rename / switching chat session)
  // Useful for determining which session has been loaded (i.e. still on `new, empty session` or `previous session`)
  const loadedIdSessionRef = useRef<number | null>(existingChatSessionId);

  // Assistants
  const filteredAssistants = orderAssistantsForUser(availableAssistants, user);

  const existingChatSessionAssistantId = selectedChatSession?.persona_id;
  const [selectedAssistant, setSelectedAssistant] = useState<
    Persona | undefined
  >(
    // NOTE: look through available assistants here, so that even if the user
    // has hidden this assistant it still shows the correct assistant when
    // going back to an old chat session
    existingChatSessionAssistantId !== undefined
      ? availableAssistants.find(
          (assistant) => assistant.id === existingChatSessionAssistantId
        )
      : defaultSelectedAssistantId !== undefined
        ? availableAssistants.find(
            (assistant) => assistant.id === defaultSelectedAssistantId
          )
        : undefined
  );

  // Gather default temperature settings
  const search_param_temperature = searchParams.get(
    SEARCH_PARAM_NAMES.TEMPERATURE
  );
  const defaultTemperature = search_param_temperature
    ? parseFloat(search_param_temperature)
    : selectedAssistant?.tools.some(
          (tool) =>
            tool.in_code_tool_id === "SearchTool" ||
            tool.in_code_tool_id === "InternetSearchTool"
        )
      ? 0
      : 0.7;

  const setSelectedAssistantFromId = (assistantId: number) => {
    // NOTE: also intentionally look through available assistants here, so that
    // even if the user has hidden an assistant they can still go back to it
    // for old chats
    setSelectedAssistant(
      availableAssistants.find((assistant) => assistant.id === assistantId)
    );
  };

  const llmOverrideManager = useLlmOverride(
    user?.preferences.default_model,
    selectedChatSession,
    defaultTemperature
  );

  const [alternativeAssistant, setAlternativeAssistant] =
    useState<Persona | null>(null);

  const liveAssistant =
    alternativeAssistant ||
    selectedAssistant ||
    filteredAssistants[0] ||
    availableAssistants[0];
  useEffect(() => {
    if (!loadedIdSessionRef.current && !currentPersonaId) {
      return;
    }

    const personaDefault = getLLMProviderOverrideForPersona(
      liveAssistant,
      llmProviders
    );

    if (personaDefault) {
      llmOverrideManager.setLlmOverride(personaDefault);
    } else if (user?.preferences.default_model) {
      llmOverrideManager.setLlmOverride(
        destructureValue(user?.preferences.default_model)
      );
    }
  }, [liveAssistant]);

  const stopGeneration = () => {
    if (abortController) {
      abortController.abort();
    }
    const lastMessage = messageHistory[messageHistory.length - 1];
    if (
      lastMessage &&
      lastMessage.type === "assistant" &&
      lastMessage.toolCalls[0] &&
      lastMessage.toolCalls[0].tool_result === undefined
    ) {
      const newCompleteMessageMap = new Map(completeMessageDetail.messageMap);
      const updatedMessage = { ...lastMessage, toolCalls: [] };
      newCompleteMessageMap.set(lastMessage.messageId, updatedMessage);
      setCompleteMessageDetail({
        sessionId: completeMessageDetail.sessionId,
        messageMap: newCompleteMessageMap,
      });
    }
  };

  // this is for "@"ing assistants

  // this is used to track which assistant is being used to generate the current message
  // for example, this would come into play when:
  // 1. default assistant is `Danswer`
  // 2. we "@"ed the `GPT` assistant and sent a message
  // 3. while the `GPT` assistant message is generating, we "@" the `Paraphrase` assistant
  const [alternativeGeneratingAssistant, setAlternativeGeneratingAssistant] =
    useState<Persona | null>(null);

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

  const [isReady, setIsReady] = useState(false);
  useEffect(() => {
    Prism.highlightAll();
    setIsReady(true);
  }, []);

  // this is triggered every time the user switches which chat
  // session they are using
  useEffect(() => {
    const priorChatSessionId = chatSessionIdRef.current;
    const loadedSessionId = loadedIdSessionRef.current;
    chatSessionIdRef.current = existingChatSessionId;
    loadedIdSessionRef.current = existingChatSessionId;

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
    }

    async function initialSessionFetch() {
      if (existingChatSessionId === null) {
        setIsFetchingChatMessages(false);
        if (defaultSelectedAssistantId !== undefined) {
          setSelectedAssistantFromId(defaultSelectedAssistantId);
        } else {
          setSelectedAssistant(undefined);
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
      clearSelectedDocuments();
      setIsFetchingChatMessages(true);
      const response = await fetch(
        `/api/chat/get-chat-session/${existingChatSessionId}`
      );

      const chatSession = (await response.json()) as BackendChatSession;
      setSelectedAssistantFromId(chatSession.persona_id);

      const newMessageMap = processRawChatHistory(chatSession.messages);
      const newMessageHistory = buildLatestMessageChain(newMessageMap);

      // Update message history except for edge where where
      // last message is an error and we're on a new chat.
      // This corresponds to a "renaming" of chat, which occurs after first message
      // stream
      if (
        messageHistory[messageHistory.length - 1]?.type !== "error" ||
        loadedSessionId != null
      ) {
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

  const [submittedMessage, setSubmittedMessage] = useState("");
  const [chatState, setChatState] = useState<ChatState>("input");
  interface RegenerationState {
    regenerating: boolean;
    finalMessageIndex: number;
  }

  const [regenerationState, setRegenerationState] =
    useState<RegenerationState | null>(null);

  const [abortController, setAbortController] =
    useState<AbortController | null>(null);

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

  const [chatSessionSharedStatus, setChatSessionSharedStatus] =
    useState<ChatSessionSharedStatus>(ChatSessionSharedStatus.Private);

  useEffect(() => {
    if (messageHistory.length === 0 && chatSessionIdRef.current === null) {
      setSelectedAssistant(
        filteredAssistants.find(
          (persona) => persona.id === defaultSelectedAssistantId
        )
      );
    }
  }, [defaultSelectedAssistantId]);

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
        `/api/chat/max-selected-document-tokens?persona_id=${liveAssistant.id}`
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
      selectedPersona: selectedAssistant,
      availableSources,
      availableDocumentSets,
    });

  const [currentFeedback, setCurrentFeedback] = useState<
    [FeedbackType, number] | null
  >(null);

  const [sharingModalVisible, setSharingModalVisible] =
    useState<boolean>(false);

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

  const distance = 500; // distance that should "engage" the scroll
  const debounce = 100; // time for debouncing

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
      for await (const packet of sendMessage(params)) {
        if (params.signal?.aborted) {
          throw new Error("AbortError");
        }
        stack.push(packet);
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        if (error.name === "AbortError") {
          console.debug("Stream aborted");
        } else {
          stack.error = error.message;
        }
      } else {
        stack.error = String(error);
      }
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
    alternativeAssistantOverride = null,
    modelOverRide,
    regenerationRequest,
  }: {
    messageIdToResend?: number;
    messageOverride?: string;
    queryOverride?: string;
    forceSearch?: boolean;
    isSeededChat?: boolean;
    alternativeAssistantOverride?: Persona | null;
    modelOverRide?: LlmOverride;
    regenerationRequest?: RegenerationRequest | null;
  } = {}) => {
    if (chatState != "input") {
      setPopup({
        message: "Please wait for the response to complete",
        type: "error",
      });

      return;
    }
    setRegenerationState(
      regenerationRequest
        ? { regenerating: true, finalMessageIndex: messageIdToResend || 0 }
        : null
    );

    setChatState("loading");

    const controller = new AbortController();
    setAbortController(controller);

    setAlternativeGeneratingAssistant(alternativeAssistantOverride);
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
      setRegenerationState(null);
      setChatState("input");
      return;
    }
    let currMessage = messageToResend ? messageToResend.message : message;
    if (messageOverride) {
      currMessage = messageOverride;
    }

    setSubmittedMessage(currMessage);
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

    const currentAssistantId = alternativeAssistantOverride
      ? alternativeAssistantOverride.id
      : alternativeAssistant
        ? alternativeAssistant.id
        : liveAssistant.id;

    resetInputBar();
    let messageUpdates: Message[] | null = null;

    let answer = "";
    let query: string | null = null;
    let retrievalType: RetrievalType =
      selectedDocuments.length > 0
        ? RetrievalType.SelectedDocs
        : RetrievalType.None;
    let documents: DanswerDocument[] = selectedDocuments;
    let aiMessageImages: FileDescriptor[] | null = null;
    let error: string | null = null;
    let stackTrace: string | null = null;

    let finalMessage: BackendMessage | null = null;
    let toolCalls: ToolCallMetadata[] = [];

    let initialFetchDetails: null | {
      user_message_id: number;
      assistant_message_id: number;
      frozenMessageMap: Map<number, Message>;
      frozenSessionId: number | null;
    } = null;

    try {
      const mapKeys = Array.from(completeMessageDetail.messageMap.keys());
      const systemMessage = Math.min(...mapKeys);

      const lastSuccessfulMessageId =
        getLastSuccessfulMessageId(currMessageHistory) || systemMessage;

      const stack = new CurrentMessageFIFO();
      updateCurrentMessageFIFO(stack, {
        signal: controller.signal, // Add this line
        message: currMessage,
        alternateAssistantId: currentAssistantId,
        fileDescriptors: currentMessageFiles,
        parentMessageId:
          regenerationRequest?.parentMessage.messageId ||
          lastSuccessfulMessageId,
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
        regenerate: regenerationRequest !== undefined,
        modelProvider:
          modelOverRide?.name ||
          llmOverrideManager.llmOverride.name ||
          llmOverrideManager.globalDefault.name ||
          undefined,
        modelVersion:
          modelOverRide?.modelName ||
          llmOverrideManager.llmOverride.modelName ||
          searchParams.get(SEARCH_PARAM_NAMES.MODEL_VERSION) ||
          llmOverrideManager.globalDefault.modelName ||
          undefined,
        temperature: llmOverrideManager.temperature || undefined,
        systemPromptOverride:
          searchParams.get(SEARCH_PARAM_NAMES.SYSTEM_PROMPT) || undefined,
        useExistingUserMessage: isSeededChat,
      });

      const delay = (ms: number) => {
        return new Promise((resolve) => setTimeout(resolve, ms));
      };

      await delay(50);
      while (!stack.isComplete || !stack.isEmpty()) {
        await delay(2);

        if (!stack.isEmpty()) {
          const packet = stack.nextPacket();
          if (!packet) {
            continue;
          }

          if (!initialFetchDetails) {
            if (!Object.hasOwn(packet, "user_message_id")) {
              console.error(
                "First packet should contain message response info "
              );
              continue;
            }

            const messageResponseIDInfo = packet as MessageResponseIDInfo;

            const user_message_id = messageResponseIDInfo.user_message_id!;
            const assistant_message_id =
              messageResponseIDInfo.reserved_assistant_message_id;

            // we will use tempMessages until the regenerated message is complete
            messageUpdates = [
              {
                messageId: regenerationRequest
                  ? regenerationRequest?.parentMessage?.messageId!
                  : user_message_id,
                message: currMessage,
                type: "user",
                files: currentMessageFiles,
                toolCalls: [],
                parentMessageId: parentMessage?.messageId || SYSTEM_MESSAGE_ID,
              },
            ];

            if (parentMessage && !regenerationRequest) {
              messageUpdates.push({
                ...parentMessage,
                childrenMessageIds: (
                  parentMessage.childrenMessageIds || []
                ).concat([user_message_id]),
                latestChildMessageId: user_message_id,
              });
            }

            const {
              messageMap: currentFrozenMessageMap,
              sessionId: currentFrozenSessionId,
            } = upsertToCompleteMessageMap({
              messages: messageUpdates,
              chatSessionId: currChatSessionId,
            });

            const frozenMessageMap = currentFrozenMessageMap;
            const frozenSessionId = currentFrozenSessionId;
            initialFetchDetails = {
              frozenMessageMap,
              frozenSessionId,
              assistant_message_id,
              user_message_id,
            };

            setRegenerationState(null);
          } else {
            const { user_message_id, frozenMessageMap, frozenSessionId } =
              initialFetchDetails;
            setChatState((chatState) => {
              if (chatState == "loading") {
                return "streaming";
              }
              return chatState;
            });

            if (Object.hasOwn(packet, "answer_piece")) {
              answer += (packet as AnswerPiecePacket).answer_piece;
            } else if (Object.hasOwn(packet, "top_documents")) {
              documents = (packet as DocumentsResponse).top_documents;
              query = (packet as DocumentsResponse).rephrased_query;
              retrievalType = RetrievalType.Search;
              if (documents && documents.length > 0) {
                // point to the latest message (we don't know the messageId yet, which is why
                // we have to use -1)
                setSelectedMessageForDocDisplay(user_message_id);
              }
            } else if (Object.hasOwn(packet, "tool_name")) {
              toolCalls = [
                {
                  tool_name: (packet as ToolCallMetadata).tool_name,
                  tool_args: (packet as ToolCallMetadata).tool_args,
                  tool_result: (packet as ToolCallMetadata).tool_result,
                },
              ];
              if (
                !toolCalls[0].tool_result ||
                toolCalls[0].tool_result == undefined
              ) {
                setChatState("toolBuilding");
              } else {
                setChatState("streaming");
              }
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
              stackTrace = (packet as StreamingError).stack_trace;
            } else if (Object.hasOwn(packet, "message_id")) {
              finalMessage = packet as BackendMessage;
            }

            // on initial message send, we insert a dummy system message
            // set this as the parent here if no parent is set
            parentMessage =
              parentMessage || frozenMessageMap?.get(SYSTEM_MESSAGE_ID)!;

            const updateFn = (messages: Message[]) => {
              const replacementsMap = regenerationRequest
                ? new Map([
                    [
                      regenerationRequest?.parentMessage?.messageId,
                      regenerationRequest?.parentMessage?.messageId,
                    ],
                    [
                      regenerationRequest?.messageId,
                      initialFetchDetails?.assistant_message_id,
                    ],
                  ] as [number, number][])
                : null;

              return upsertToCompleteMessageMap({
                messages: messages,
                replacementsMap: replacementsMap,
                completeMessageMapOverride: frozenMessageMap,
                chatSessionId: frozenSessionId!,
              });
            };

            updateFn([
              {
                messageId: regenerationRequest
                  ? regenerationRequest?.parentMessage?.messageId!
                  : initialFetchDetails.user_message_id!,
                message: currMessage,
                type: "user",
                files: currentMessageFiles,
                toolCalls: [],
                parentMessageId: error ? null : lastSuccessfulMessageId,
                childrenMessageIds: [
                  ...(regenerationRequest?.parentMessage?.childrenMessageIds ||
                    []),
                  initialFetchDetails.assistant_message_id!,
                ],
                latestChildMessageId: initialFetchDetails.assistant_message_id,
              },
              {
                messageId: initialFetchDetails.assistant_message_id!,
                message: error || answer,
                type: error ? "error" : "assistant",
                retrievalType,
                query: finalMessage?.rephrased_query || query,
                documents:
                  finalMessage?.context_docs?.top_documents || documents,
                citations: finalMessage?.citations || {},
                files: finalMessage?.files || aiMessageImages || [],
                toolCalls: finalMessage?.tool_calls || toolCalls,
                parentMessageId: regenerationRequest
                  ? regenerationRequest?.parentMessage?.messageId!
                  : initialFetchDetails.user_message_id,
                alternateAssistantID: alternativeAssistant?.id,
                stackTrace: stackTrace,
                overridden_model: finalMessage?.overridden_model,
              },
            ]);
          }
        }
      }
    } catch (e: any) {
      const errorMsg = e.message;
      upsertToCompleteMessageMap({
        messages: [
          {
            messageId:
              initialFetchDetails?.user_message_id || TEMP_USER_MESSAGE_ID,
            message: currMessage,
            type: "user",
            files: currentMessageFiles,
            toolCalls: [],
            parentMessageId: parentMessage?.messageId || SYSTEM_MESSAGE_ID,
          },
          {
            messageId:
              initialFetchDetails?.assistant_message_id ||
              TEMP_ASSISTANT_MESSAGE_ID,
            message: errorMsg,
            type: "error",
            files: aiMessageImages || [],
            toolCalls: [],
            parentMessageId:
              initialFetchDetails?.user_message_id || TEMP_USER_MESSAGE_ID,
          },
        ],
        completeMessageMapOverride: completeMessageDetail.messageMap,
      });
    }
    setRegenerationState(null);
    setChatState("input");
    if (isNewSession) {
      if (finalMessage) {
        setSelectedMessageForDocDisplay(finalMessage.message_id);
      }

      if (!searchParamBasedChatSessionName) {
        await new Promise((resolve) => setTimeout(resolve, 200));
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

  const onAssistantChange = (assistant: Persona | null) => {
    if (assistant && assistant.id !== liveAssistant.id) {
      // Abort the ongoing stream if it exists
      if (chatState != "input") {
        stopGeneration();
        resetInputBar();
      }

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
  const enterpriseSettings = settings?.enterpriseSettings;
  if (settings?.settings?.chat_page_enabled === false) {
    router.push("/search");
  }

  const [showDocSidebar, setShowDocSidebar] = useState(false); // State to track if sidebar is open

  // Used to maintain a "time out" for history sidebar so our existing refs can have time to process change
  const [untoggled, setUntoggled] = useState(false);

  const explicitlyUntoggle = () => {
    setShowDocSidebar(false);

    setUntoggled(true);
    setTimeout(() => {
      setUntoggled(false);
    }, 200);
  };
  const toggleSidebar = () => {
    Cookies.set(
      SIDEBAR_TOGGLED_COOKIE_NAME,
      String(!toggledSidebar).toLocaleLowerCase()
    ),
      {
        path: "/",
      };

    toggle();
  };
  const removeToggle = () => {
    setShowDocSidebar(false);
    toggle(false);
  };

  const sidebarElementRef = useRef<HTMLDivElement>(null);

  useSidebarVisibility({
    toggledSidebar,
    sidebarElementRef,
    showDocSidebar,
    setShowDocSidebar,
    setToggled: removeToggle,
    mobile: settings?.isMobile,
  });

  useScrollonStream({
    chatState,
    scrollableDivRef,
    scrollDist,
    endDivRef,
    distance,
    debounce,
  });

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
  const [stackTraceModalContent, setStackTraceModalContent] = useState<
    string | null
  >(null);

  const innerSidebarElementRef = useRef<HTMLDivElement>(null);
  const [settingsToggled, setSettingsToggled] = useState(false);

  const currentPersona = alternativeAssistant || liveAssistant;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "e":
            event.preventDefault();
            toggleSidebar();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [router]);
  const [sharedChatSession, setSharedChatSession] =
    useState<ChatSession | null>();
  const [deletingChatSession, setDeletingChatSession] =
    useState<ChatSession | null>();

  const showDeleteModal = (chatSession: ChatSession) => {
    setDeletingChatSession(chatSession);
  };
  const showShareModal = (chatSession: ChatSession) => {
    setSharedChatSession(chatSession);
  };
  const [documentSelection, setDocumentSelection] = useState(false);
  const toggleDocumentSelectionAspects = () => {
    setDocumentSelection((documentSelection) => !documentSelection);
    setShowDocSidebar(false);
  };
  const secondsUntilExpiration = getSecondsUntilExpiration(user);

  interface RegenerationRequest {
    messageId: number;
    parentMessage: Message;
  }

  function createRegenerator(regenerationRequest: RegenerationRequest) {
    // Returns new function that only needs `modelOverRide` to be specified when called
    return async function (modelOverRide: LlmOverride) {
      return await onSubmit({
        modelOverRide,
        messageIdToResend: regenerationRequest.parentMessage.messageId,
        regenerationRequest,
      });
    };
  }

  return (
    <>
      <HealthCheckBanner secondsUntilExpiration={secondsUntilExpiration} />
      {/* ChatPopup is a custom popup that displays a admin-specified message on initial user visit. 
      Only used in the EE version of the app. */}
      {popup}

      <ChatPopup />
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

      {settingsToggled && (
        <SetDefaultModelModal
          setLlmOverride={llmOverrideManager.setGlobalDefault}
          defaultModel={user?.preferences.default_model!}
          llmProviders={llmProviders}
          onClose={() => setSettingsToggled(false)}
        />
      )}

      {deletingChatSession && (
        <DeleteChatModal
          onClose={() => setDeletingChatSession(null)}
          onSubmit={async () => {
            const response = await deleteChatSession(deletingChatSession.id);
            if (response.ok) {
              setDeletingChatSession(null);
              // go back to the main page
              router.push("/chat");
            } else {
              alert("Failed to delete chat session");
            }
          }}
          chatSessionName={deletingChatSession.name}
        />
      )}

      {stackTraceModalContent && (
        <ExceptionTraceModal
          onOutsideClick={() => setStackTraceModalContent(null)}
          exceptionTrace={stackTraceModalContent}
        />
      )}

      {sharedChatSession && (
        <ShareChatSessionModal
          chatSessionId={sharedChatSession.id}
          existingSharedStatus={sharedChatSession.shared_status}
          onClose={() => setSharedChatSession(null)}
          onShare={(shared) =>
            setChatSessionSharedStatus(
              shared
                ? ChatSessionSharedStatus.Public
                : ChatSessionSharedStatus.Private
            )
          }
        />
      )}
      {sharingModalVisible && chatSessionIdRef.current !== null && (
        <ShareChatSessionModal
          chatSessionId={chatSessionIdRef.current}
          existingSharedStatus={chatSessionSharedStatus}
          onClose={() => setSharingModalVisible(false)}
        />
      )}
      <div className="fixed inset-0 flex flex-col text-default">
        <div className="h-[100dvh] overflow-y-hidden">
          <div className="w-full">
            <div
              ref={sidebarElementRef}
              className={`
                flex-none
                fixed
                left-0
                z-30
                bg-background-100
                h-screen
                transition-all
                bg-opacity-80
                duration-300
                ease-in-out
                ${
                  !untoggled && (showDocSidebar || toggledSidebar)
                    ? "opacity-100 w-[250px] translate-x-0"
                    : "opacity-0 w-[200px] pointer-events-none -translate-x-10"
                }`}
            >
              <div className="w-full relative">
                <HistorySidebar
                  explicitlyUntoggle={explicitlyUntoggle}
                  stopGenerating={stopGeneration}
                  reset={() => setMessage("")}
                  page="chat"
                  ref={innerSidebarElementRef}
                  toggleSidebar={toggleSidebar}
                  toggled={toggledSidebar && !settings?.isMobile}
                  existingChats={chatSessions}
                  currentChatSession={selectedChatSession}
                  folders={folders}
                  openedFolders={openedFolders}
                  removeToggle={removeToggle}
                  showShareModal={showShareModal}
                  showDeleteModal={showDeleteModal}
                />
              </div>
            </div>
          </div>

          <div
            ref={masterFlexboxRef}
            className="flex h-full w-full overflow-x-hidden"
          >
            <div className="flex h-full flex-col w-full">
              {liveAssistant && (
                <FunctionalHeader
                  sidebarToggled={toggledSidebar}
                  reset={() => setMessage("")}
                  page="chat"
                  setSharingModalVisible={
                    chatSessionIdRef.current !== null
                      ? setSharingModalVisible
                      : undefined
                  }
                  toggleSidebar={toggleSidebar}
                  user={user}
                  currentChatSession={selectedChatSession}
                />
              )}

              {documentSidebarInitialWidth !== undefined && isReady ? (
                <Dropzone onDrop={handleImageUpload} noClick>
                  {({ getRootProps }) => (
                    <div className="flex h-full w-full">
                      {!settings?.isMobile && (
                        <div
                          style={{ transition: "width 0.30s ease-out" }}
                          className={`
                          flex-none 
                          overflow-y-hidden 
                          bg-background-100 
                          transition-all 
                          bg-opacity-80
                          duration-300 
                          ease-in-out
                          h-full
                          ${toggledSidebar ? "w-[250px]" : "w-[0px]"}
                      `}
                        ></div>
                      )}

                      <div
                        className={`h-full w-full relative flex-auto transition-margin duration-300 overflow-x-auto mobile:pb-12 desktop:pb-[100px]`}
                        {...getRootProps()}
                      >
                        {/* <input {...getInputProps()} /> */}
                        <div
                          className={`w-full h-full flex flex-col overflow-y-auto include-scrollbar overflow-x-hidden relative`}
                          ref={scrollableDivRef}
                        >
                          {/* ChatBanner is a custom banner that displays a admin-specified message at 
                      the top of the chat page. Oly used in the EE version of the app. */}

                          {messageHistory.length === 0 &&
                            !isFetchingChatMessages &&
                            chatState == "input" && (
                              <ChatIntro
                                availableSources={finalAvailableSources}
                                selectedPersona={liveAssistant}
                              />
                            )}
                          <div
                            className={
                              "mt-4 -ml-4  w-full mx-auto " +
                              "absolute mobile:top-0 desktop:top-12 left-0" +
                              (hasPerformedInitialScroll ? "" : "invisible")
                            }
                          >
                            {messageHistory.map((message, i) => {
                              const messageMap =
                                completeMessageDetail.messageMap;
                              const messageReactComponentKey = `${i}-${completeMessageDetail.sessionId}`;
                              const parentMessage = message.parentMessageId
                                ? messageMap.get(message.parentMessageId)
                                : null;
                              if (
                                regenerationState &&
                                regenerationState.regenerating &&
                                message.messageId >
                                  regenerationState.finalMessageIndex
                              ) {
                                return <></>;
                              }

                              if (message.type === "user") {
                                return (
                                  <div key={messageReactComponentKey}>
                                    <HumanMessage
                                      stopGenerating={stopGeneration}
                                      content={message.message}
                                      files={message.files}
                                      messageId={message.messageId}
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
                                      otherMessagesCanSwitchTo={
                                        parentMessage?.childrenMessageIds || []
                                      }
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
                                        setSelectedMessageForDocDisplay(
                                          messageId
                                        );
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
                                  i === messageHistory.length - 1;
                                const previousMessage =
                                  i !== 0 ? messageHistory[i - 1] : null;

                                const currentAlternativeAssistant =
                                  message.alternateAssistantID != null
                                    ? availableAssistants.find(
                                        (persona) =>
                                          persona.id ==
                                          message.alternateAssistantID
                                      )
                                    : null;

                                if (
                                  regenerationState &&
                                  regenerationState.regenerating &&
                                  // chatState == "loading" &&
                                  message.messageId >
                                    regenerationState.finalMessageIndex - 1
                                ) {
                                  return <></>;
                                }
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
                                      overriddenModel={message.overridden_model}
                                      regenerate={createRegenerator({
                                        messageId: message.messageId,
                                        parentMessage: parentMessage!,
                                      })}
                                      otherMessagesCanSwitchTo={
                                        parentMessage?.childrenMessageIds || []
                                      }
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
                                        setSelectedMessageForDocDisplay(
                                          messageId
                                        );
                                        // set message as latest so we can edit this message
                                        // and so it sticks around on page reload
                                        setMessageAsLatest(messageId);
                                      }}
                                      isActive={messageHistory.length - 1 == i}
                                      selectedDocuments={selectedDocuments}
                                      toggleDocumentSelection={
                                        toggleDocumentSelectionAspects
                                      }
                                      docs={message.documents}
                                      currentPersona={liveAssistant}
                                      alternativeAssistant={
                                        currentAlternativeAssistant
                                      }
                                      messageId={message.messageId}
                                      content={message.message}
                                      // content={message.message}
                                      files={message.files}
                                      query={
                                        messageHistory[i]?.query || undefined
                                      }
                                      personaName={liveAssistant.name}
                                      citedDocuments={getCitedDocumentsFromMessage(
                                        message
                                      )}
                                      toolCall={
                                        message.toolCalls &&
                                        message.toolCalls[0]
                                      }
                                      isComplete={
                                        i !== messageHistory.length - 1 ||
                                        (chatState != "streaming" &&
                                          chatState != "toolBuilding")
                                      }
                                      hasDocs={
                                        (message.documents &&
                                          message.documents.length > 0) === true
                                      }
                                      handleFeedback={
                                        i === messageHistory.length - 1 &&
                                        chatState != "input"
                                          ? undefined
                                          : (feedbackType) =>
                                              setCurrentFeedback([
                                                feedbackType,
                                                message.messageId as number,
                                              ])
                                      }
                                      handleSearchQueryEdit={
                                        i === messageHistory.length - 1 &&
                                        chatState == "input"
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
                                                previousMessage.messageId ===
                                                null
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
                                                alternativeAssistantOverride:
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
                                            alternativeAssistantOverride:
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
                                      currentPersona={liveAssistant}
                                      messageId={message.messageId}
                                      personaName={liveAssistant.name}
                                      content={
                                        <p className="text-red-700 text-sm my-auto">
                                          {message.message}
                                          {message.stackTrace && (
                                            <span
                                              onClick={() =>
                                                setStackTraceModalContent(
                                                  message.stackTrace!
                                                )
                                              }
                                              className="ml-2 cursor-pointer underline"
                                            >
                                              Show stack trace.
                                            </span>
                                          )}
                                        </p>
                                      }
                                    />
                                  </div>
                                );
                              }
                            })}
                            {chatState == "loading" &&
                              !regenerationState?.regenerating &&
                              messageHistory[messageHistory.length - 1]?.type !=
                                "user" && (
                                <HumanMessage
                                  messageId={-1}
                                  content={submittedMessage}
                                />
                              )}

                            {chatState == "loading" && (
                              <div
                                key={`${messageHistory.length}-${chatSessionIdRef.current}`}
                              >
                                <AIMessage
                                  currentPersona={liveAssistant}
                                  alternativeAssistant={
                                    alternativeGeneratingAssistant ??
                                    alternativeAssistant
                                  }
                                  messageId={null}
                                  personaName={liveAssistant.name}
                                  content={
                                    <div
                                      key={"Generating"}
                                      className="mr-auto relative inline-block"
                                    >
                                      <span className="text-sm loading-text">
                                        Thinking...
                                      </span>
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
                            {/* Some padding at the bottom so the search bar has space at the bottom to not cover the last message*/}
                            <div ref={endPaddingRef} className="h-[95px]" />
                            <div ref={endDivRef} />
                          </div>
                        </div>
                        <div
                          ref={inputRef}
                          className="absolute bottom-0 z-10 w-full"
                        >
                          <div className="w-[95%] mx-auto relative mb-8">
                            {aboveHorizon && (
                              <div className="pointer-events-none w-full bg-transparent flex sticky justify-center">
                                <button
                                  onClick={() => clientScrollToBottom()}
                                  className="p-1 pointer-events-auto rounded-2xl bg-background-strong border border-border mb-2 mx-auto "
                                >
                                  <FiArrowDown size={18} />
                                </button>
                              </div>
                            )}

                            <ChatInputBar
                              chatState={chatState}
                              stopGenerating={stopGeneration}
                              openModelSettings={() => setSettingsToggled(true)}
                              inputPrompts={userInputPrompts}
                              showDocs={() => setDocumentSelection(true)}
                              selectedDocuments={selectedDocuments}
                              // assistant stuff
                              assistantOptions={filteredAssistants}
                              selectedAssistant={liveAssistant}
                              setSelectedAssistant={onAssistantChange}
                              setAlternativeAssistant={setAlternativeAssistant}
                              alternativeAssistant={alternativeAssistant}
                              // end assistant stuff
                              message={message}
                              setMessage={setMessage}
                              onSubmit={onSubmit}
                              filterManager={filterManager}
                              llmOverrideManager={llmOverrideManager}
                              files={currentMessageFiles}
                              setFiles={setCurrentMessageFiles}
                              handleFileUpload={handleImageUpload}
                              textAreaRef={textAreaRef}
                              chatSessionId={chatSessionIdRef.current!}
                            />

                            {enterpriseSettings &&
                              enterpriseSettings.custom_lower_disclaimer_content && (
                                <div className="mobile:hidden mt-4 flex items-center justify-center relative w-[95%] mx-auto">
                                  <div className="text-sm text-text-500 max-w-searchbar-max px-4 text-center">
                                    <MinimalMarkdown
                                      className=""
                                      content={
                                        enterpriseSettings.custom_lower_disclaimer_content
                                      }
                                    />
                                  </div>
                                </div>
                              )}

                            {enterpriseSettings &&
                              enterpriseSettings.use_custom_logotype && (
                                <div className="hidden lg:block absolute right-0 bottom-0">
                                  <img
                                    src={
                                      "/api/enterprise-settings/logotype?u=" +
                                      Date.now()
                                    }
                                    alt="logotype"
                                    style={{ objectFit: "contain" }}
                                    className="w-fit h-8"
                                  />
                                </div>
                              )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </Dropzone>
              ) : (
                <div className="mx-auto h-full flex">
                  <div
                    style={{ transition: "width 0.30s ease-out" }}
                    className={`flex-none bg-transparent transition-all bg-opacity-80 duration-300 ease-in-out h-full
                        ${toggledSidebar ? "w-[250px] " : "w-[0px]"}`}
                  />
                  <div className="my-auto">
                    <DanswerInitializingLoader />
                  </div>
                </div>
              )}
            </div>
          </div>
          <FixedLogo toggleSidebar={toggleSidebar} />
        </div>
      </div>
      <DocumentSidebar
        initialWidth={350}
        ref={innerSidebarElementRef}
        closeSidebar={() => setDocumentSelection(false)}
        selectedMessage={aiMessage}
        selectedDocuments={selectedDocuments}
        toggleDocumentSelection={toggleDocumentSelection}
        clearSelectedDocuments={clearSelectedDocuments}
        selectedDocumentTokens={selectedDocumentTokens}
        maxTokens={maxTokens}
        isLoading={isFetchingChatMessages}
        isOpen={documentSelection}
      />
    </>
  );
}
