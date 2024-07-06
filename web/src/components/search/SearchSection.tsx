"use client";

import { useContext, useEffect, useRef, useState } from "react";
import { SearchBar } from "./SearchBar";
import {
  AgenticDisclaimer,
  SearchResultsDisplay,
} from "./SearchResultsDisplay";
import { SourceSelector } from "./filtering/Filters";
import {
  CCPairBasicInfo,
  Connector,
  DocumentSet,
  Tag,
  User,
} from "@/lib/types";
import {
  DanswerDocument,
  Quote,
  SearchResponse,
  FlowType,
  SearchType,
  SearchDefaultOverrides,
  SearchRequestOverrides,
  ValidQuestionResponse,
} from "@/lib/search/interfaces";
import { searchRequestStreamed } from "@/lib/search/streamingQa";
import { SearchHelper } from "./SearchHelper";
import { CancellationToken, cancellable } from "@/lib/search/cancellable";
import { useFilters, useObjectState } from "@/lib/hooks";
import { questionValidationStreamed } from "@/lib/search/streamingQuestionValidation";
import { Persona } from "@/app/admin/assistants/interfaces";
import { PersonaSelector } from "./PersonaSelector";
import { computeAvailableFilters } from "@/lib/filters";
import { useRouter, useSearchParams } from "next/navigation";
import { SettingsContext } from "../settings/SettingsProvider";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import { UserDropdown } from "../UserDropdown";
import ResizableSection from "../resizable/ResizableSection";
import { HistorySidebar } from "@/app/chat/sessionSidebar/HistorySidebar";
import { SIDEBAR_WIDTH_CONST } from "@/lib/constants";
import { BackendChatSession, ChatSession } from "@/app/chat/interfaces";
import { FiBookmark, FiInfo } from "react-icons/fi";
import { HoverPopup } from "../HoverPopup";
import { Logo } from "../Logo";
import { cornersOfRectangle } from "@dnd-kit/core/dist/utilities/algorithms/helpers";
import FunctionalHeader from "../chat_search/Header";
import { useSidebarVisibility } from "../chat_search/hooks";

export type searchState = "input" | "searching" | "analyzing";

const SEARCH_DEFAULT_OVERRIDES_START: SearchDefaultOverrides = {
  forceDisplayQA: false,
  offset: 0,
};

const VALID_QUESTION_RESPONSE_DEFAULT: ValidQuestionResponse = {
  reasoning: null,
  answerable: null,
  error: null,
};

interface SearchSectionProps {
  ccPairs: CCPairBasicInfo[];
  documentSets: DocumentSet[];
  personas: Persona[];
  tags: Tag[];

  querySessions: ChatSession[];
  defaultSearchType: SearchType;
  user: User | null;
}

export const SearchSection = ({
  ccPairs,
  documentSets,
  personas,
  user,
  tags,
  querySessions,
  defaultSearchType,
}: SearchSectionProps) => {
  // Search Bar
  const [query, setQuery] = useState<string>("");
  const [relevance, setRelevance] = useState<any>(null);
  const [comments, setComments] = useState<any>(null);

  // Search
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(
    null
  );
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "/":
            event.preventDefault();
            toggleAgentic();

            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const [agentic, setAgentic] = useState(false);

  const toggleAgentic = () => {
    setAgentic((agentic) => !agentic);
  };

  const [isFetching, setIsFetching] = useState(false);

  const [validQuestionResponse, setValidQuestionResponse] =
    useObjectState<ValidQuestionResponse>(VALID_QUESTION_RESPONSE_DEFAULT);

  // Search Type
  const [selectedSearchType, setSelectedSearchType] =
    useState<SearchType>(defaultSearchType);

  const [selectedPersona, setSelectedPersona] = useState<number>(
    personas[0]?.id || 0
  );

  // Filters
  const filterManager = useFilters();
  const availableSources = ccPairs.map((ccPair) => ccPair.source);
  const [finalAvailableSources, finalAvailableDocumentSets] =
    computeAvailableFilters({
      selectedPersona: personas.find(
        (persona) => persona.id === selectedPersona
      ),
      availableSources: availableSources,
      availableDocumentSets: documentSets,
    });

  const searchParams = useSearchParams();
  const existingSearchIdRaw = searchParams.get("searchId");
  const existingSearchessionId = existingSearchIdRaw
    ? parseInt(existingSearchIdRaw)
    : null;

  useEffect(() => {
    if (existingSearchIdRaw == null) {
      return;
    }
    function extractFirstUserMessage(
      chatSession: BackendChatSession
    ): string | null {
      const userMessage = chatSession?.messages.find(
        (msg) => msg.message_type === "user"
      );
      return userMessage ? userMessage.message : null;
    }

    async function initialSessionFetch() {
      const response = await fetch(
        `/api/chat/get-chat-session/${existingSearchessionId}`
      );
      const searchSession = (await response.json()) as BackendChatSession;
      const message = extractFirstUserMessage(searchSession);
      if (message) {
        toggleSidebar();
        setQuery(message);
        onSearch({ overrideMessage: message });
      }
    }
    initialSessionFetch();
  }, [existingSearchessionId]);

  // Overrides for default behavior that only last a single query
  const [defaultOverrides, setDefaultOverrides] =
    useState<SearchDefaultOverrides>(SEARCH_DEFAULT_OVERRIDES_START);

  // Helpers
  const initialSearchResponse: SearchResponse = {
    answer: null,
    quotes: null,
    documents: null,
    suggestedSearchType: null,
    suggestedFlowType: null,
    selectedDocIndices: null,
    error: null,
    messageId: null,
  };

  // Streaming updates
  const updateCurrentAnswer = (answer: string) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      answer,
    }));
  const updateQuotes = (quotes: Quote[]) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      quotes,
    }));
  const updateDocs = (documents: DanswerDocument[]) => {
    setSearchState("analyzing");

    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      documents,
    }));
  };
  const updateSuggestedSearchType = (suggestedSearchType: SearchType) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      suggestedSearchType,
    }));
  const updateSuggestedFlowType = (suggestedFlowType: FlowType) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      suggestedFlowType,
    }));
  const updateSelectedDocIndices = (docIndices: number[]) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      selectedDocIndices: docIndices,
    }));
  const updateError = (error: FlowType) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      error,
    }));
  const updateMessageId = (messageId: number) =>
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      messageId,
    }));
  const updateDocumentRelevance = (relevance: any) => {
    setRelevance(relevance);
  };
  const updateComments = (comments: any) => {
    setComments(comments);
  };
  const finishedSearching = () => {
    setSearchState("input");
  };

  const resetInput = () => {
    setSweep(false);
    setFirstSearch(false);
    setRelevance(null);
    setComments(null);
    setSearchState("searching");
  };

  const [showAgenticDisclaimer, setShowAgenticDisclaimer] = useState(false);
  const [agenticResults, setAgenticResults] = useState<boolean | null>(null);

  let lastSearchCancellationToken = useRef<CancellationToken | null>(null);
  const onSearch = async ({
    searchType,
    agentic,
    offset,
    overrideMessage,
  }: SearchRequestOverrides = {}) => {
    setAgenticResults(agentic!);
    if (agentic) {
      setTimeout(() => {
        setShowAgenticDisclaimer(true);
      }, 1000);
    }
    resetInput();

    if (lastSearchCancellationToken.current) {
      lastSearchCancellationToken.current.cancel();
    }
    lastSearchCancellationToken.current = new CancellationToken();

    setIsFetching(true);
    setSearchResponse(initialSearchResponse);
    setValidQuestionResponse(VALID_QUESTION_RESPONSE_DEFAULT);
    const searchFnArgs = {
      query: overrideMessage || query,
      sources: filterManager.selectedSources,
      agentic: agentic,
      documentSets: filterManager.selectedDocumentSets,
      timeRange: filterManager.timeRange,
      tags: filterManager.selectedTags,
      persona: personas.find(
        (persona) => persona.id === selectedPersona
      ) as Persona,
      updateCurrentAnswer: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateCurrentAnswer,
      }),
      updateQuotes: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateQuotes,
      }),
      updateDocs: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateDocs,
      }),
      updateSuggestedSearchType: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateSuggestedSearchType,
      }),
      updateSuggestedFlowType: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateSuggestedFlowType,
      }),
      updateSelectedDocIndices: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateSelectedDocIndices,
      }),
      updateError: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateError,
      }),
      updateMessageId: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateMessageId,
      }),
      updateDocStatus: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateMessageId,
      }),
      updateDocumentRelevance: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateDocumentRelevance,
      }),
      updateComments: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateComments,
      }),
      finishedSearching: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: finishedSearching,
      }),

      selectedSearchType: searchType ?? selectedSearchType,
      offset: offset ?? defaultOverrides.offset,
    };

    const questionValidationArgs = {
      query,
      update: setValidQuestionResponse,
    };

    await Promise.all([
      searchRequestStreamed(searchFnArgs),
      questionValidationStreamed(questionValidationArgs),
    ]);

    setIsFetching(false);
  };

  // handle redirect if search page is disabled
  // NOTE: this must be done here, in a client component since
  // settings are passed in via Context and therefore aren't
  // available in server-side components
  const router = useRouter();
  const settings = useContext(SettingsContext);
  if (settings?.settings?.search_page_enabled === false) {
    router.push("/chat");
  }
  const sidebarElementRef = useRef<HTMLDivElement>(null);
  const innerSidebarElementRef = useRef<HTMLDivElement>(null);

  const [filters, setFilters] = useState(true);
  const toggleFilters = () => {
    setFilters((filters) => !filters);
  };

  const [showDocSidebar, setShowDocSidebar] = useState(false);

  const toggleSidebar = () => {
    setToggledSidebar((toggledSidebar) => !toggledSidebar); // Toggle the state which will in turn toggle the class
    console.log(!toggledSidebar, showDocSidebar);
  };

  const forceNonAgentic = () => {
    setAgenticResults(false);
  };

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

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLDivElement>) => {
    if (e.propertyName === "opacity" && !firstSearch) {
      const target = e.target as HTMLDivElement;
      target.style.display = "none";
    }
  };
  const [sweep, setSweep] = useState(false);
  const performSweep = () => {
    setSweep((sweep) => !sweep);
  };
  const [firstSearch, setFirstSearch] = useState(true);
  const [searchState, setSearchState] = useState<searchState>("input");

  const [toggledSidebar, setToggledSidebar] = useState(false); // State to track if sidebar is open

  useSidebarVisibility({
    toggledSidebar,
    sidebarElementRef,
    showDocSidebar,
    setShowDocSidebar,
  });

  return (
    <>
      <div className="flex relative  w-full h-full text-default overflow-x-hidden">
        <div
          ref={sidebarElementRef}
          className={`
            w-[300px] 
            flex-none 
            absolute 
            left-0 
            z-[100] 
            overflow-y-hidden 
            sidebar 
            bg-background-weak 
            h-screen
            transition-all 
            bg-opacity-80
            duration-300 
            ease-in-out
            ${
              showDocSidebar || toggledSidebar
                ? "opacity-100 translate-x-0"
                : "opacity-0  pointer-events-none -translate-x-10"
            }
          `}
        >
          <div className="w-full  relative">
            <HistorySidebar
              ref={innerSidebarElementRef}
              toggleSidebar={toggleSidebar}
              toggled={toggledSidebar}
              existingChats={querySessions}
              // currentChatSession={selectedChatSession}
              // folders={folders}
              // openedFolders={openedFolders}
            />
          </div>
        </div>

        {/* Header */}

        <div className="absolute left-0 w-full top-0 ">
          <FunctionalHeader
            showSidebar={showDocSidebar}
            page="search"
            user={user}
          />
          <div className="px-24  pt-10 relative max-w-[2000px] xl:max-w-[1430px] mx-auto">
            <div className="absolute  z-10 top-12 left-0 hidden 2xl:block w-52 3xl:w-64">
              {(ccPairs.length > 0 || documentSets.length > 0) && (
                <SourceSelector
                  {...filterManager}
                  showDocSidebar={showDocSidebar || toggledSidebar}
                  toggled={filters}
                  toggleFilters={toggleFilters}
                  availableDocumentSets={finalAvailableDocumentSets}
                  existingSources={finalAvailableSources}
                  availableTags={tags}
                />
              )}
            </div>
            <div className="absolute left-0 hidden 2xl:block w-52 3xl:w-64"></div>
            <div className="max-w-searchbar-max w-[90%] mx-auto">
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  firstSearch
                    ? "opacity-100 max-h-[500px]"
                    : "opacity-0 max-h-0"
                }`}
                onTransitionEnd={handleTransitionEnd}
              >
                <div className="mt-48 mb-8 flex justify-center items-center">
                  <div className="w-message-xs 2xl:w-message-sm 3xl:w-message">
                    <div className="flex">
                      <div className="text-3xl font-bold text-strong mx-auto">
                        {/* <div className="font-regular text-gray-900 font-display text-3xl md:text-4xl mx-auto"> */}
                        {/* Organization&apos;s knowledge. */}
                        Unlocking Insights
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <SearchBar
                toggleAgentic={toggleAgentic}
                agentic={agentic}
                searchState={searchState}
                query={query}
                setQuery={setQuery}
                onSearch={async (agentic?: boolean) => {
                  setDefaultOverrides(SEARCH_DEFAULT_OVERRIDES_START);
                  await onSearch({ agentic, offset: 0 });
                }}
              />

              {/* Keep for now */}
              {/* <div className="flex gap-x-4 flex-wrap w-full">
            <div className="block 2xl:block w-52 3xl:w-64 mt-4">
              <div className="pr-5">
                <SearchHelper
                  isFetching={isFetching}
                  searchResponse={searchResponse}
                  selectedSearchType={selectedSearchType}
                  setSelectedSearchType={setSelectedSearchType}
                  defaultOverrides={defaultOverrides}
                  restartSearch={onSearch}
                  forceQADisplay={() =>
                    setDefaultOverrides((prevState) => ({
                      ...(prevState || SEARCH_DEFAULT_OVERRIDES_START),
                      forceDisplayQA: true,
                    }))
                  }
                  setOffset={(offset) => {
                    setDefaultOverrides((prevState) => ({
                      ...(prevState || SEARCH_DEFAULT_OVERRIDES_START),
                      offset,
                    }));
                  }}
                />
              </div>
            </div>
          </div> */}

              <div className="mt-6">
                {!(agenticResults && isFetching) ? (
                  <SearchResultsDisplay
                    comments={comments}
                    sweep={sweep}
                    agenticResults={agenticResults}
                    performSweep={performSweep}
                    relevance={relevance}
                    searchState={searchState}
                    searchResponse={searchResponse}
                    validQuestionResponse={validQuestionResponse}
                    isFetching={isFetching}
                    defaultOverrides={defaultOverrides}
                    personaName={
                      selectedPersona
                        ? personas.find((p) => p.id === selectedPersona)?.name
                        : null
                    }
                  />
                ) : (
                  showAgenticDisclaimer && (
                    <AgenticDisclaimer forceNonAgentic={forceNonAgentic} />
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
