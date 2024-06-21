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
import { EE_ENABLED } from "./constants";

const CREDENTIAL_URL = "/api/manage/admin/credential";

import { useEffect, useRef } from "react";

export type IScrollOnStream = {
  isStreaming: boolean;
  inputRef: RefObject<HTMLDivElement>;
  endDivRef: RefObject<HTMLDivElement>;
  scrollableDivRef: RefObject<HTMLDivElement>;
  distance?: number;
  debounce?: number;
  setAboveHorizon: Dispatch<SetStateAction<boolean>>;
};

/**
 * Scrolls on streaming of text, if within param `distance`
 */
export const useScrollOnStream = ({
  endDivRef,
  inputRef,
  isStreaming,
  scrollableDivRef,
  distance = 500, // distance that should "engage" the scroll
  debounce = 100, // time for debouncing
  setAboveHorizon,
}: IScrollOnStream) => {
  // Refs for efficiency
  const preventScrollInterference = useRef<boolean>(false);
  const preventScroll = useRef<boolean>(false);
  const blockActionRef = useRef<boolean>(false);
  const previousScroll = useRef<number>(0);
  const scrollDist = useRef<number>(0);

  const updateScrollTracking = () => {
    const scrollDistance =
      endDivRef?.current?.getBoundingClientRect()?.top! -
      inputRef?.current?.getBoundingClientRect()?.top!;
    scrollDist.current = scrollDistance;
    setAboveHorizon(scrollDist.current > 500);
  };

  scrollableDivRef?.current?.addEventListener("scroll", updateScrollTracking);

  useEffect(() => {
    if (isStreaming && scrollableDivRef && scrollableDivRef.current) {
      updateScrollTracking();

      let newHeight: number = scrollableDivRef.current?.scrollTop!;
      const heightDifference = newHeight - previousScroll.current;
      previousScroll.current = newHeight;

      // Prevent streaming scroll
      if (heightDifference < 0 && !preventScroll.current) {
        // Stop current
        scrollableDivRef.current.style.scrollBehavior = "auto";
        scrollableDivRef.current.scrollTop = scrollableDivRef.current.scrollTop;
        scrollableDivRef.current.style.scrollBehavior = "smooth";
        preventScrollInterference.current = true;
        preventScroll.current = true;

        setTimeout(() => {
          preventScrollInterference.current = false;
        }, 2000);
        setTimeout(() => {
          preventScroll.current = false;
        }, 10000);
      }

      // Ensure can scroll
      else if (!preventScrollInterference.current) {
        preventScroll.current = false;
      }

      if (
        scrollDist.current < distance &&
        !blockActionRef.current &&
        !blockActionRef.current &&
        !preventScroll.current
      ) {
        // catch up if necessary!
        const scrollAmount =
          scrollDist.current + (scrollDist.current > 140 ? 2000 : 0);
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
      if (scrollDist.current < distance) {
        scrollableDivRef?.current?.scrollBy({
          left: 0,
          top: Math.max(scrollDist.current + 600, 0),
          behavior: "smooth",
        });
      }
    }
  }, [isStreaming]);
};

export type IResponsiveScroll = {
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
}: IResponsiveScroll) => {
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
  const swrResponse = useSWR<User[]>(url, errorHandlingFetcher);

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
}

export function useLlmOverride(): LlmOverrideManager {
  const [llmOverride, setLlmOverride] = useState<LlmOverride>({
    name: "",
    provider: "",
    modelName: "",
  });
  const [temperature, setTemperature] = useState<number | null>(null);
  return {
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

  if (!EE_ENABLED) {
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
