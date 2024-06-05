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
import { RefObject, useState } from "react";
import { DateRangePickerValue } from "@tremor/react";
import { SourceMetadata } from "./search/interfaces";
import { destructureValue } from "./llm/utils";
import { ChatSession } from "@/app/chat/interfaces";
import { UsersResponse } from "./users/interfaces";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";

const CREDENTIAL_URL = "/api/manage/admin/credential";

import { useEffect, useRef } from "react";

export type AutoScrollHookType = {
  isStreaming: boolean;
  lastMessageRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLDivElement>;
  endDivRef: RefObject<HTMLDivElement>;
  distance?: number;
};

/**
 * Scrolls on streaming of text, if within `distance`
 */
export const useScrollOnStream = ({
  isStreaming,
  lastMessageRef,
  inputRef,
  endDivRef,
  distance = 140, // distance that should "engage" the scroll
}: AutoScrollHookType) => {
  useEffect(() => {
    // Is text streaming? + null checks
    if (isStreaming && lastMessageRef.current && inputRef.current) {
      const lastMessageRect = lastMessageRef.current.getBoundingClientRect();
      const endDivRect = inputRef.current.getBoundingClientRect();
      console.log(endDivRect.bottom - lastMessageRect.bottom);

      // Is the bottom of the final chat within the engagement distance?
      if (
        endDivRect.bottom - lastMessageRect.bottom > distance &&
        endDivRef?.current
      ) {
        endDivRef.current.scrollIntoView({ behavior: "smooth" });
      }
    }
  });
};

export type InitialScrollType = {
  isFetchingChatMessages: boolean;
  endDivRef: RefObject<HTMLDivElement>;
  hasPerformedInitialScroll: boolean;
  initialScrollComplete: () => void;
  isStreaming: boolean;
};

/**
 * Initial scroll (specifically for the situation in which your input is too long)
 */
export const useInitialScroll = ({
  isStreaming,
  endDivRef,
  hasPerformedInitialScroll,
  initialScrollComplete,
}: InitialScrollType) => {
  useEffect(() => {
    // Check: have we done this before? + null checks
    if (!hasPerformedInitialScroll && endDivRef.current && isStreaming) {
      console.log("Initial scroll");
      endDivRef.current.scrollIntoView({ behavior: "smooth" });

      initialScrollComplete();
    }
  });
};

export type ResponsiveScrollType = {
  lastMessageRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLDivElement>;
  endDivRef: RefObject<HTMLDivElement>;
  textAreaRef: RefObject<HTMLTextAreaElement>;
};

/**
 * Scroll in cases where the input bar covers previously visible bottom of text
 */
export const useResponsiveScroll = ({
  lastMessageRef,
  inputRef,
  endDivRef,
  textAreaRef,
}: ResponsiveScrollType) => {
  useEffect(() => {
    let timeoutId: NodeJS.Timeout | null = null;
    let prevInputHeight = 0;
    let prevDistance = 0;

    // Core logic
    const handleInputResize = async () => {
      console.log("Handle!");
      function delay(ms: number) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }
      await delay(100);

      // Validate that message and input exist
      if (
        lastMessageRef &&
        inputRef &&
        inputRef.current &&
        lastMessageRef.current
      ) {
        const lastMessageRect = lastMessageRef.current.getBoundingClientRect();
        const endDivRect = inputRef.current.getBoundingClientRect();
        const currentInputHeight = endDivRect.height;

        if (
          // Validate change in height
          currentInputHeight > prevInputHeight &&
          // Validate distance
          endDivRect.top <= lastMessageRect.bottom
        ) {
          // Validate previous distance and existence of the final div
          if (prevDistance > -100 && endDivRef && endDivRef?.current) {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            timeoutId = setTimeout(() => {
              if (endDivRef && endDivRef?.current) {
                // TODO
                // window.scrollBy({
                //   top: currentInputHeight - prevInputHeight,
                //   behavior: 'smooth',
                // });

                endDivRef?.current.scrollIntoView({ behavior: "smooth" });
              }
            }, 500);
          }

          prevInputHeight = currentInputHeight;
        }
        if (currentInputHeight !== prevInputHeight) {
          prevInputHeight = currentInputHeight;
        }
      }

      // Update previous distance for calculation (regardless of scroll)
      if (
        lastMessageRef &&
        inputRef &&
        inputRef.current &&
        lastMessageRef.current
      ) {
        const lastMessageRect = lastMessageRef.current.getBoundingClientRect();
        const endDivRect = inputRef.current.getBoundingClientRect();
        prevDistance = endDivRect.top - lastMessageRect.bottom;
      }
    };

    const textarea = textAreaRef.current;
    if (textarea) {
      textarea.addEventListener("input", handleInputResize);
    }

    return () => {
      if (textarea) {
        textarea.removeEventListener("input", handleInputResize);
      }
      if (timeoutId) {
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
