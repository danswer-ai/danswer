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
import { EE_ENABLED } from "./constants";

const CREDENTIAL_URL = "/api/manage/admin/credential";

import { useEffect, useRef } from "react";

export type AutoScrollHookType = {
  isStreaming: boolean;
  lastMessageRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLDivElement>;
  endDivRef: RefObject<HTMLDivElement>;
  distance?: number;
  debounce?: number;
};

/**
 * Scrolls on streaming of text, if within param `distance`
 */
export const useScrollOnStream = ({
  isStreaming,
  lastMessageRef,
  inputRef,
  endDivRef,
  distance = 140, // distance that should "engage" the scroll
  debounce = 150, // time for debouncing
}: AutoScrollHookType) => {
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    // Function to handle the scroll itself
    const handleScroll = () => {
      if (lastMessageRef.current && inputRef.current && endDivRef?.current) {
        const lastMessageRect = lastMessageRef.current.getBoundingClientRect();
        const endDivRect = inputRef.current.getBoundingClientRect();

        // Check if the bottom of the final chat is within the engagement distance
        if (endDivRect.bottom - lastMessageRect.bottom > distance) {
          endDivRef.current.scrollIntoView({ behavior: "smooth" });
        }
      }
    };

    // Debounce the scroll event
    if (isStreaming) {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(
        handleScroll,
        debounce
      ) as unknown as number;
    }

    // Cleanup function to clear the timeout when the component unmounts or the inputs change
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  });
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

/**
 * Scroll in cases where the input bar covers previously visible bottom of text
 */
// export type ResponsiveScrollParams = {
//   lastMessageRef: RefObject<HTMLDivElement>;
//   inputRef: RefObject<HTMLDivElement>;
//   endDivRef: RefObject<HTMLDivElement>;
//   textAreaRef: RefObject<HTMLTextAreaElement>;
// };

// export const useResponsiveScroll = ({
//   lastMessageRef,
//   inputRef,
//   endDivRef,
//   textAreaRef,
// }: ResponsiveScrollParams) => {
//   useEffect(() => {

//     let timeoutId: ReturnType<typeof setTimeout> | null = null;
//     let prevInputHeight = 0;
//     console.log("handling?")

//     const handleInputResize = () => {
//       if (timeoutId !== null) {
//         clearTimeout(timeoutId);
//       }
//       timeoutId = setTimeout(() => {
//         if (inputRef.current && lastMessageRef.current) {
//           const inputRect = inputRef.current.getBoundingClientRect();
//           const currentInputHeight = inputRect.height;
//           const paddingNeeded = currentInputHeight - prevInputHeight;

//           if (paddingNeeded > 0 && endDivRef.current) {
//             endDivRef.current.style.paddingBottom = `${paddingNeeded}px`;
//           }

//           lastMessageRef.current.scrollIntoView({ behavior: 'smooth' });

//           prevInputHeight = currentInputHeight;
//         }
//       }, 300);  // Adjust timeout as needed
//     };

//     const textarea = textAreaRef.current;
//     if (textarea) {
//       textarea.addEventListener('input', handleInputResize);
//     }

//     return () => {
//       if (textarea) {
//         textarea.removeEventListener('input', handleInputResize);
//       }
//       if (timeoutId !== null) {
//         clearTimeout(timeoutId);
//       }
//     };
//   }, [lastMessageRef, inputRef, endDivRef, textAreaRef]);
// };

//

// import { RefObject, useEffect, useState } from "react";

export type ResponsiveScrollParams = {
  lastMessageRef: RefObject<HTMLDivElement>;
  inputRef: RefObject<HTMLDivElement>;
  endDivRef: RefObject<HTMLDivElement>;
  textAreaRef: RefObject<HTMLTextAreaElement>;
  extraDivRef: RefObject<HTMLDivElement>; // Ref to the div you want to adjust
};

export const useResponsiveScroll2 = ({
  lastMessageRef,
  inputRef,
  endDivRef,
  textAreaRef,
  extraDivRef,
}: ResponsiveScrollParams) => {
  const [extraHeight, setExtraHeight] = useState(0); // Starting with default 50px

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let prevInputHeight = 0;

    const handleInputResize = () => {
      // console.log("Rescroll")
      // console.log(inputRef)

      if (timeoutId !== null) {
        clearTimeout(timeoutId);
      }

      setTimeout(() => {
        // console.log("inputRef")

        if (inputRef.current && lastMessageRef.current) {
          const inputRect = inputRef.current.getBoundingClientRect();
          const currentInputHeight = inputRect.height;
          const paddingNeeded = currentInputHeight - prevInputHeight;

          console.log(paddingNeeded);

          if (
            endDivRef.current &&
            extraDivRef.current
            // && paddingNeeded > 0
          ) {
            extraDivRef.current.style.height = `${extraHeight + paddingNeeded}px`;
            setExtraHeight((extraHeight) => extraHeight + paddingNeeded);
            endDivRef?.current.scrollIntoView({ behavior: "smooth" });

            // console.log
            // endDivRef.current.scrollBy(extraHeight, extraHeight)

            // Set the dynamic height based on input bar
          }

          prevInputHeight = currentInputHeight;
        }
      }, 300);
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

  // Apply the dynamic height to the extra div
  // useEffect(() => {
  //   if (extraDivRef.current && endDivRef.current) {
  //     console.log("Changing height")

  //     // endDivRef?.current.scrollIntoView({ behavior: "smooth" });
  //     // endDivRef?.current.scrollIntoView({ behavior: "smooth" });

  //     // lastMessageRef.current.scrollTo(0,0)

  //   }
  // }, [extraHeight, extraDivRef]);
};

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
