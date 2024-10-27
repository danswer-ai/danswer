"use client";

import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { FullSearchBar, SearchBar } from "./SearchBar";
import { SearchResultsDisplay } from "./SearchResultsDisplay";
import { SourceSelector } from "./filtering/Filters";
import {
  SearchEnmeddDocument,
  Quote,
  SearchResponse,
  FlowType,
  SearchType,
  SearchDefaultOverrides,
  SearchRequestOverrides,
  ValidQuestionResponse,
  Relevance,
} from "@/lib/search/interfaces";
import { searchRequestStreamed } from "@/lib/search/streamingQa";
import { CancellationToken, cancellable } from "@/lib/search/cancellable";
import { useFilters, useObjectState } from "@/lib/hooks";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { AssistantSelector } from "./AssistantSelector";
import { computeAvailableFilters } from "@/lib/filters";
import { useRouter, useSearchParams, useParams } from "next/navigation";
import { SettingsContext } from "../settings/SettingsProvider";
import { ChatSession, SearchSession } from "@/app/chat/interfaces";
import FunctionalHeader from "../chat_search/Header";
import { useSidebarVisibility } from "../chat_search/hooks";
import { AGENTIC_SEARCH_TYPE_COOKIE_NAME } from "@/lib/constants";
import Cookies from "js-cookie";
import FixedLogo from "@/app/chat/shared_chat_search/FixedLogo";
import { usePopup } from "../admin/connectors/Popup";
import { FeedbackType } from "@/app/chat/types";
import { FeedbackModal } from "@/app/chat/modal/FeedbackModal";
import { deleteChatSession, handleChatFeedback } from "@/app/chat/lib";
import SearchAnswer from "./SearchAnswer";
import { DeleteEntityModal } from "../modals/DeleteEntityModal";
import { ApiKeyModal } from "../llm/ApiKeyModal";
import { useUser } from "../user/UserProvider";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Filter } from "lucide-react";
import { Button } from "../ui/button";
import { DateRangeSearchSelector } from "./DateRangeSearchSelector";
import { SortSearch } from "./SortSearch";
import { SearchHelper } from "./SearchHelper";
import { CCPairBasicInfo, DocumentSet, Tag } from "@/lib/types";
import { useSearchContext } from "@/context/SearchContext";
import { useToast } from "@/hooks/use-toast";

export type searchState =
  | "input"
  | "searching"
  | "reading"
  | "analyzing"
  | "summarizing"
  | "generating"
  | "citing";

const SEARCH_DEFAULT_OVERRIDES_START: SearchDefaultOverrides = {
  forceDisplayQA: false,
  offset: 0,
};

const VALID_QUESTION_RESPONSE_DEFAULT: ValidQuestionResponse = {
  reasoning: null,
  error: null,
};

interface SearchSectionProps {
  defaultSearchType: SearchType;
}

export const SearchSection = ({ defaultSearchType }: SearchSectionProps) => {
  const {
    querySessions,
    ccPairs,
    documentSets,
    assistants,
    tags,
    shouldShowWelcomeModal,
    agenticSearchEnabled,
    disabledAgentic,
    shouldDisplayNoSources,
  } = useSearchContext();

  const [query, setQuery] = useState<string>("");
  const [comments, setComments] = useState<any>(null);
  const [contentEnriched, setContentEnriched] = useState(false);

  const { teamspaceId } = useParams();
  const { toast } = useToast();

  const [searchResponse, setSearchResponse] = useState<SearchResponse>({
    suggestedSearchType: null,
    suggestedFlowType: null,
    answer: null,
    quotes: null,
    documents: null,
    selectedDocIndices: null,
    error: null,
    messageId: null,
  });

  const [showApiKeyModal, setShowApiKeyModal] = useState(true);

  const [agentic, setAgentic] = useState(agenticSearchEnabled);

  const toggleAgentic = useCallback(() => {
    Cookies.set(
      AGENTIC_SEARCH_TYPE_COOKIE_NAME,
      String(!agentic).toLocaleLowerCase()
    );
    setAgentic((agentic) => !agentic);
  }, [agentic]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "/":
            toggleAgentic();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleAgentic]);

  const [isFetching, setIsFetching] = useState(false);

  // Search Type
  const selectedSearchType = defaultSearchType;

  const [selectedAssistant, setSelectedAssistant] = useState<number>(
    assistants[0]?.id || 0
  );
  const [analyzeStartTime, setAnalyzeStartTime] = useState<number>(0);

  // Filters
  const filterManager = useFilters();
  const availableSources = ccPairs.map((ccPair) => ccPair.source);
  const [finalAvailableSources, finalAvailableDocumentSets] =
    computeAvailableFilters({
      selectedAssistant: assistants.find(
        (assistant) => assistant.id === selectedAssistant
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
    function extractFirstMessageByType(
      chatSession: SearchSession,
      messageType: "user" | "assistant"
    ): string | null {
      const userMessage = chatSession?.messages.find(
        (msg) => msg.message_type === messageType
      );
      return userMessage ? userMessage.message : null;
    }

    async function initialSessionFetch() {
      const response = await fetch(
        `/api/query/search-session/${existingSearchessionId}`
      );
      const searchSession = (await response.json()) as SearchSession;
      const userMessage = extractFirstMessageByType(searchSession, "user");
      const assistantMessage = extractFirstMessageByType(
        searchSession,
        "assistant"
      );

      if (userMessage) {
        setQuery(userMessage);
        const enmeddDocs: SearchResponse = {
          documents: searchSession.documents,
          suggestedSearchType: null,
          answer: assistantMessage || "Search response not found",
          quotes: null,
          selectedDocIndices: null,
          error: null,
          messageId: existingSearchIdRaw ? parseInt(existingSearchIdRaw) : null,
          suggestedFlowType: null,
          additional_relevance: undefined,
        };

        setIsFetching(false);
        setFirstSearch(false);
        setSearchResponse(enmeddDocs);
        setContentEnriched(true);
      }
    }
    initialSessionFetch();
  }, [existingSearchessionId, existingSearchIdRaw]);

  // Overrides for default behavior that only last a single query
  const [defaultOverrides, setDefaultOverrides] =
    useState<SearchDefaultOverrides>(SEARCH_DEFAULT_OVERRIDES_START);

  const newSearchState = (
    currentSearchState: searchState,
    newSearchState: searchState
  ) => {
    if (currentSearchState != "input") {
      return newSearchState;
    }
    return "input";
  };

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
    additional_relevance: undefined,
  };
  // Streaming updates
  const updateCurrentAnswer = (answer: string) => {
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      answer,
    }));

    if (analyzeStartTime) {
      const elapsedTime = Date.now() - analyzeStartTime;
      const nextInterval = Math.ceil(elapsedTime / 1500) * 1500;
      setTimeout(() => {
        setSearchState((searchState) =>
          newSearchState(searchState, "generating")
        );
      }, nextInterval - elapsedTime);
    }
  };

  const updateQuotes = (quotes: Quote[]) => {
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      quotes,
    }));
    setSearchState((searchState) => "citing");
  };

  const updateDocs = (documents: SearchEnmeddDocument[]) => {
    if (agentic) {
      setTimeout(() => {
        setSearchState((searchState) => newSearchState(searchState, "reading"));
      }, 1500);

      setTimeout(() => {
        setAnalyzeStartTime(Date.now());
        setSearchState((searchState) => {
          const newState = newSearchState(searchState, "analyzing");
          if (newState === "analyzing") {
            setAnalyzeStartTime(Date.now());
          }
          return newState;
        });
      }, 4500);
    }

    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      documents,
    }));
    if (disabledAgentic) {
      setIsFetching(false);
      setSearchState((searchState) => "citing");
    }
    if (documents.length == 0) {
      setSearchState("input");
    }
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
  const updateError = (error: FlowType) => {
    resetInput(true);

    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      error,
    }));
  };
  const updateMessageAndThreadId = (
    messageId: number,
    chat_session_id: number
  ) => {
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      messageId,
    }));
    router.refresh();
    setIsFetching(false);
    setSearchState((searchState) => "input");
  };

  const updateDocumentRelevance = (relevance: Relevance) => {
    setSearchResponse((prevState) => ({
      ...(prevState || initialSearchResponse),
      additional_relevance: relevance,
    }));

    setContentEnriched(true);

    setIsFetching(false);
    if (disabledAgentic) {
      setSearchState("input");
    } else {
      setSearchState("analyzing");
    }
  };

  const updateComments = (comments: any) => {
    setComments(comments);
  };

  const finishedSearching = () => {
    if (disabledAgentic) {
      setSearchState("input");
    }
  };
  const { user } = useUser();
  const [searchAnswerExpanded, setSearchAnswerExpanded] = useState(false);

  const resetInput = (finalized?: boolean) => {
    setSweep(false);
    setFirstSearch(false);
    setComments(null);
    setSearchState(finalized ? "input" : "searching");
    setSearchAnswerExpanded(false);
  };

  const [previousSearch, setPreviousSearch] = useState<string>("");
  const [agenticResults, setAgenticResults] = useState<boolean | null>(null);

  let lastSearchCancellationToken = useRef<CancellationToken | null>(null);
  const onSearch = async ({
    searchType,
    agentic,
    offset,
    overrideMessage,
  }: SearchRequestOverrides = {}) => {
    if ((overrideMessage || query) == "") {
      return;
    }
    setAgenticResults(agentic!);
    resetInput();
    setContentEnriched(false);

    if (lastSearchCancellationToken.current) {
      lastSearchCancellationToken.current.cancel();
    }
    lastSearchCancellationToken.current = new CancellationToken();

    setIsFetching(true);
    setSearchResponse(initialSearchResponse);
    setPreviousSearch(overrideMessage || query);
    const searchFnArgs = {
      query: overrideMessage || query,
      sources: filterManager.selectedSources,
      agentic: agentic,
      documentSets: filterManager.selectedDocumentSets,
      timeRange: filterManager.timeRange,
      tags: filterManager.selectedTags,
      assistant: assistants.find(
        (assistant) => assistant.id === selectedAssistant
      ) as Assistant,
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
      updateMessageAndThreadId: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateMessageAndThreadId,
      }),
      updateDocStatus: cancellable({
        cancellationToken: lastSearchCancellationToken.current,
        fn: updateMessageAndThreadId,
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

    await Promise.all([searchRequestStreamed(searchFnArgs)]);
  };

  // handle redirect if search page is disabled
  // NOTE: this must be done here, in a client component since
  // settings are passed in via Context and therefore aren't
  // available in server-side components
  const router = useRouter();
  const settings = useContext(SettingsContext);
  if (settings?.settings?.search_page_enabled === false) {
    router.push(teamspaceId ? `/t/${teamspaceId}/chat` : "/chat");
  }

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

  // Used to maintain a "time out" for history sidebar so our existing refs can have time to process change

  const { answer, quotes, documents, error, messageId } = searchResponse;

  const dedupedQuotes: Quote[] = [];
  const seen = new Set<string>();
  if (quotes) {
    quotes.forEach((quote) => {
      if (!seen.has(quote.document_id)) {
        dedupedQuotes.push(quote);
        seen.add(quote.document_id);
      }
    });
  }
  const [currentFeedback, setCurrentFeedback] = useState<
    [FeedbackType, number] | null
  >(null);

  const onFeedback = async (
    messageId: number,
    feedbackType: FeedbackType,
    feedbackDetails: string,
    predefinedFeedback: string | undefined
  ) => {
    const response = await handleChatFeedback(
      messageId,
      feedbackType,
      feedbackDetails,
      predefinedFeedback
    );

    if (response.ok) {
      toast({
        title: "Feedback Submitted",
        description: "Thanks for your feedback!",
        variant: "success",
      });
    } else {
      const responseJson = await response.json();
      const errorMsg = responseJson.detail || responseJson.message;
      toast({
        title: "Submission Error",
        description: `Failed to submit feedback - ${errorMsg}`,
        variant: "destructive",
      });
    }
  };

  const chatBannerPresent = settings?.workspaces?.custom_header_content;

  const shouldUseAgenticDisplay =
    agenticResults &&
    (searchResponse.documents || []).some(
      (document) =>
        searchResponse.additional_relevance &&
        searchResponse.additional_relevance[document.document_id] !== undefined
    );

  return (
    <div className="relative flex h-full max-w-full gap-16 ml-auto lg:gap-10 xl:gap-10 2xl:gap-20">
      <div className="flex w-full gap-5">
        <div className="w-full space-y-5">
          <div className="relative flex gap-2">
            <FullSearchBar
              disabled={previousSearch === query}
              toggleAgentic={disabledAgentic ? undefined : toggleAgentic}
              agentic={agentic}
              query={query}
              setQuery={setQuery}
              onSearch={async (agentic?: boolean) => {
                setDefaultOverrides(SEARCH_DEFAULT_OVERRIDES_START);
                await onSearch({ agentic, offset: 0 });
              }}
              finalAvailableDocumentSets={finalAvailableDocumentSets}
              finalAvailableSources={finalAvailableSources}
              filterManager={filterManager}
              documentSets={documentSets}
              ccPairs={ccPairs}
              tags={tags}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="lg:hidden">
                  <Filter size={16} className="" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[85vw] sm:w-full">
                {(ccPairs.length > 0 || documentSets.length > 0) && (
                  <SourceSelector
                    {...filterManager}
                    availableDocumentSets={finalAvailableDocumentSets}
                    existingSources={finalAvailableSources}
                    availableTags={tags}
                  />
                )}
              </PopoverContent>
            </Popover>
          </div>

          {!firstSearch && (
            <SearchAnswer
              isFetching={isFetching}
              dedupedQuotes={dedupedQuotes}
              searchResponse={searchResponse}
              setSearchAnswerExpanded={setSearchAnswerExpanded}
              searchAnswerExpanded={searchAnswerExpanded}
              setCurrentFeedback={setCurrentFeedback}
              searchState={searchState}
            />
          )}

          <div className="flex flex-col justify-between w-full gap-5 md:flex-row">
            <div className="items-center hidden gap-2 ml-auto lg:flex">
              <DateRangeSearchSelector
                value={filterManager.timeRange}
                onValueChange={filterManager.setTimeRange}
              />
              <SortSearch />
            </div>
          </div>

          <div className="mt-6">
            {!(agenticResults && isFetching) || disabledAgentic ? (
              <SearchResultsDisplay
                searchState={searchState}
                disabledAgentic={disabledAgentic}
                contentEnriched={contentEnriched}
                comments={comments}
                sweep={sweep}
                agenticResults={shouldUseAgenticDisplay && !disabledAgentic}
                performSweep={performSweep}
                searchResponse={searchResponse}
                isFetching={isFetching}
                defaultOverrides={defaultOverrides}
              />
            ) : (
              <></>
            )}
          </div>
        </div>

        <div className="min-w-[220px] lg:min-w-[300px] xl:min-w-[320px] max-w-[320px] hidden lg:flex flex-col">
          {(ccPairs.length > 0 || documentSets.length > 0) && (
            <SourceSelector
              {...filterManager}
              availableDocumentSets={finalAvailableDocumentSets}
              existingSources={finalAvailableSources}
              availableTags={tags}
            />
          )}
        </div>
      </div>
    </div>
  );
};
