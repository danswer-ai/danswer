import {
  ConnectorIndexingStatus,
  Credential,
  DocumentBoostStatus,
  Tag,
  User,
  UserGroup,
} from "@/lib/types";
import useSWR, { mutate, useSWRConfig } from "swr";
import { errorHandlingFetcher } from "./fetcher";
import { Dispatch, RefObject, SetStateAction, useState } from "react";
import { DateRangePickerValue } from "@tremor/react";
import { SourceMetadata } from "./search/interfaces";
import { destructureValue } from "./llm/utils";
import { ChatSession } from "@/app/chat/interfaces";
import { UsersResponse } from "./users/interfaces";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";

const CREDENTIAL_URL = "/api/manage/admin/credential";

import { useEffect, useRef } from "react";
import { block } from "sharp";

export type AutoScrollHookType = {
  isStreaming: boolean;
  inputRef: RefObject<HTMLDivElement>;
  endDivRef: RefObject<HTMLDivElement>;
  scrollableDivRef: RefObject<HTMLDivElement>;
  distance?: number;
  debounce?: number;
  scrollDist: number;
};

/**
 * Scrolls on streaming of text, if within param `distance`
 */
export const useScrollOnStream = ({
  isStreaming,
  scrollableDivRef,
  scrollDist,
  distance = 500, // distance that should "engage" the scroll
  debounce = 200, // time for debouncing
}: AutoScrollHookType) => {
  const preventScroll = useRef<boolean>(false);
  const blockActionRef = useRef<boolean>(false);

  useEffect(() => {
    if (
      isStreaming &&
      scrollableDivRef &&
      scrollableDivRef.current &&
      !blockActionRef.current
    ) {
      if (scrollDist < distance && !blockActionRef.current) {
        // catch up if necessary!
        const scrollAmount = scrollDist + (scrollDist > 140 ? 1000 : 0);
        blockActionRef.current = true;
        scrollableDivRef?.current?.scrollBy({
          left: 0,
          top: Math.max(0, scrollAmount),
          behavior: "smooth",
        });
        setTimeout(() => {
          blockActionRef.current = false;
        }, debounce);
      }
    }
  });

  // scroll on end of stream if within distance
  useEffect(() => {
    if (scrollableDivRef?.current && !isStreaming) {
      if (scrollDist < distance) {
        scrollableDivRef?.current?.scrollBy({
          left: 0,
          top: Math.max(scrollDist + 600, 0),
          behavior: "smooth",
        });
      }
    }
  }, [isStreaming]);
};

export type InitialScrollType = {
  endDivRef: RefObject<HTMLDivElement>;
  hasPerformedInitialScroll: boolean;
  completeInitialScroll: () => void;
  isStreaming: boolean;
};

/**
 * Initial scroll (specifically for the situation in which your input is too long)
 */
export const useInitialScroll = ({
  isStreaming,
  endDivRef,
  hasPerformedInitialScroll,
  completeInitialScroll,
}: InitialScrollType) => {
  useEffect(() => {
    // Check: have we done this before? + null checks
    if (!hasPerformedInitialScroll && endDivRef.current && isStreaming) {
      endDivRef.current.scrollIntoView({ behavior: "smooth" });
      completeInitialScroll();
    }
  });
};

export type ResponsiveScrollType = {
  lastMessageRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLDivElement>;
  endDivRef: RefObject<HTMLDivElement>;
  textAreaRef: RefObject<HTMLTextAreaElement>;
};

export type ResponsiveScrollParams = {
  lastMessageRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLDivElement>;
  endPaddingRef: RefObject<HTMLDivElement>;
  textAreaRef: RefObject<HTMLTextAreaElement>;
  scrollableDivRef: RefObject<HTMLDivElement>;
};

export const useResponsiveScroll = ({
  lastMessageRef,
  inputRef,
  endPaddingRef,
  textAreaRef,
  scrollableDivRef,
}: ResponsiveScrollParams) => {
  const previousHeight = useRef<number>(
    inputRef.current?.getBoundingClientRect().height!
  );
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

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
            endPaddingRef.current.style.height = `${Math.max(newHeight - 50, 0)}px`;

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

    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.addEventListener("input", handleInputResize);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("input", handleInputResize);
      }
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }
    };
  });
};

export const usePublicCredentials = () => {
  const { mutate } = useSWRConfig();
  const swrResponse = useSWR<Credential<any>[]>(
    CREDENTIAL_URL,
    errorHandlingFetcher
  );

  return {
    ...swrResponse,
    refreshCredentials: () => mutate(CREDENTIAL_URL),
  };
};

const buildReactedDocsUrl = (ascending: boolean, limit: number) => {
  return `/api/manage/admin/doc-boosts?ascending=${ascending}&limit=${limit}`;
};

export const useMostReactedToDocuments = (
  ascending: boolean,
  limit: number
) => {
  const url = buildReactedDocsUrl(ascending, limit);
  const swrResponse = useSWR<DocumentBoostStatus[]>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshDocs: () => mutate(url),
  };
};

export const useObjectState = <T>(
  initialValue: T
): [T, (update: Partial<T>) => void] => {
  const [state, setState] = useState<T>(initialValue);
  const set = (update: Partial<T>) => {
    setState((prevState) => {
      return {
        ...prevState,
        ...update,
      };
    });
  };
  return [state, set];
};

const INDEXING_STATUS_URL = "/api/manage/admin/connector/indexing-status";

export const useConnectorCredentialIndexingStatus = (
  refreshInterval = 30000 // 30 seconds
) => {
  const { mutate } = useSWRConfig();
  const swrResponse = useSWR<ConnectorIndexingStatus<any, any>[]>(
    INDEXING_STATUS_URL,
    errorHandlingFetcher,
    { refreshInterval: refreshInterval }
  );

  return {
    ...swrResponse,
    refreshIndexingStatus: () => mutate(INDEXING_STATUS_URL),
  };
};

export const useTimeRange = (initialValue?: DateRangePickerValue) => {
  return useState<DateRangePickerValue | null>(null);
};

export interface FilterManager {
  timeRange: DateRangePickerValue | null;
  setTimeRange: React.Dispatch<
    React.SetStateAction<DateRangePickerValue | null>
  >;
  selectedSources: SourceMetadata[];
  setSelectedSources: React.Dispatch<React.SetStateAction<SourceMetadata[]>>;
  selectedDocumentSets: string[];
  setSelectedDocumentSets: React.Dispatch<React.SetStateAction<string[]>>;
  selectedTags: Tag[];
  setSelectedTags: React.Dispatch<React.SetStateAction<Tag[]>>;
}

export function useFilters(): FilterManager {
  const [timeRange, setTimeRange] = useTimeRange();
  const [selectedSources, setSelectedSources] = useState<SourceMetadata[]>([]);
  const [selectedDocumentSets, setSelectedDocumentSets] = useState<string[]>(
    []
  );
  const [selectedTags, setSelectedTags] = useState<Tag[]>([]);

  return {
    timeRange,
    setTimeRange,
    selectedSources,
    setSelectedSources,
    selectedDocumentSets,
    setSelectedDocumentSets,
    selectedTags,
    setSelectedTags,
  };
}

export const useUsers = () => {
  const url = "/api/manage/users";

  const swrResponse = useSWR<UsersResponse>(url, errorHandlingFetcher);

  return {
    ...swrResponse,
    refreshIndexingStatus: () => mutate(url),
  };
};

export interface LlmOverride {
  name: string;
  provider: string;
  modelName: string;
}

export interface LlmOverrideManager {
  llmOverride: LlmOverride;
  setLlmOverride: React.Dispatch<React.SetStateAction<LlmOverride>>;
  temperature: number | null;
  setTemperature: React.Dispatch<React.SetStateAction<number | null>>;
  updateModelOverrideForChatSession: (chatSession?: ChatSession) => void;
}

export function useLlmOverride(
  currentChatSession?: ChatSession
): LlmOverrideManager {
  const [llmOverride, setLlmOverride] = useState<LlmOverride>(
    currentChatSession && currentChatSession.current_alternate_model
      ? destructureValue(currentChatSession.current_alternate_model)
      : {
          name: "",
          provider: "",
          modelName: "",
        }
  );

  const updateModelOverrideForChatSession = (chatSession?: ChatSession) => {
    setLlmOverride(
      chatSession && chatSession.current_alternate_model
        ? destructureValue(chatSession.current_alternate_model)
        : {
            name: "",
            provider: "",
            modelName: "",
          }
    );
  };

  const [temperature, setTemperature] = useState<number | null>(null);

  return {
    updateModelOverrideForChatSession,
    llmOverride,
    setLlmOverride,
    temperature,
    setTemperature,
  };
}

/* 
EE Only APIs
*/
const USER_GROUP_URL = "/api/manage/admin/user-group";

export const useUserGroups = (): {
  data: UserGroup[] | undefined;
  isLoading: boolean;
  error: string;
  refreshUserGroups: () => void;
} => {
  const swrResponse = useSWR<UserGroup[]>(USER_GROUP_URL, errorHandlingFetcher);
  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  if (!isPaidEnterpriseFeaturesEnabled) {
    return {
      ...{
        data: [],
        isLoading: false,
        error: "",
      },
      refreshUserGroups: () => {},
    };
  }

  return {
    ...swrResponse,
    refreshUserGroups: () => mutate(USER_GROUP_URL),
  };
};
