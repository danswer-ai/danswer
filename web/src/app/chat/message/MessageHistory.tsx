import { List, AutoSizer } from "react-virtualized";

import {
  useRef,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";

import { MessageRouter } from "./MessageRouter";
import { MessageHistoryProps } from "./types";
import { debounce } from "lodash";
import { AIMessage, HumanMessage } from "./Messages";

export const MessageHistory = forwardRef<List, MessageHistoryProps>(
  (
    {
      completeMessageDetail,
      onSubmit,
      upsertToCompleteMessageMap,
      setSelectedMessageForDocDisplay,
      setMessageAsLatest,
      setCompleteMessageDetail,
      selectedMessageForDocDisplay,
      messageHistory,
      isStreaming,
      setCurrentFeedback,
      liveAssistant,
      availableAssistants,
      toggleDocumentSelectionAspects,
      selectedDocuments,
      setPopup,
      retrievalEnabled,
      alternativeGeneratingAssistant,
      alternativeAssistant,
      createRegenerator,
      submittedMessage,
      regenerationState,
      chatState,
    },
    ref
  ) => {
    const sizeMap = useRef<{ [key: number]: number }>({});
    const containerRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<List>(null);

    useImperativeHandle(ref, () => listRef.current!, []);

    useEffect(() => {
      const updateScrollingContainerHeight = () => {
        if (listRef.current && listRef.current.Grid) {
          listRef.current.recomputeRowHeights();
          const grid = listRef.current.Grid as any;
          if (grid._scrollingContainer && containerRef.current) {
            containerRef.current.style.height = `${grid._scrollingContainer.scrollHeight || 1}px`;
          }
        }
      };

      updateScrollingContainerHeight();

      const resizeObserver = new ResizeObserver(() => {
        updateScrollingContainerHeight();
        listRef.current?.recomputeRowHeights(0);
      });

      if (listRef.current && listRef.current.Grid) {
        const grid = listRef.current.Grid as any;
        if (grid._scrollingContainer) {
          resizeObserver.observe(grid._scrollingContainer);
        }
      }

      return () => {
        resizeObserver.disconnect();
      };
    }, [messageHistory, chatState, isStreaming]);

    const getSize = useCallback((index: { index: number }) => {
      return sizeMap.current[index.index] || 50;
    }, []);

    const debouncedSetSize = useCallback(
      debounce((index: number, size: number) => {
        const currentSize = sizeMap.current[index];
        if (currentSize !== size) {
          sizeMap.current[index] = size;
          if (listRef.current) {
            listRef.current.recomputeRowHeights(index);
            listRef.current.forceUpdateGrid();
          }
        }
      }, 1),
      [messageHistory]
    );

    const setSize = useCallback(
      (index: number, size: number) => {
        debouncedSetSize(index, size);
      },
      [debouncedSetSize]
    );

    const rowRenderer = ({ index, key, style }: any) => {
      if (index < messageHistory.length) {
        return (
          <div className="w-full" style={style} key={key}>
            <AutoSizer disableHeight>
              {({ width }: { width: number }) => (
                <div
                  ref={(el) => {
                    if (el) {
                      const newHeight = el.clientHeight;
                      if (newHeight !== sizeMap.current[index]) {
                        setSize(index, newHeight);
                      }
                    }
                  }}
                >
                  <MessageRouter
                    index={index}
                    style={{ width }}
                    data={{
                      regenerationState,
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
                      chatState,
                    }}
                  />
                </div>
              )}
            </AutoSizer>
          </div>
        );
      } else if (index === messageHistory.length) {
        if (
          chatState === "loading" &&
          !regenerationState?.regenerating &&
          messageHistory[messageHistory.length - 1]?.type !== "user"
        ) {
          return (
            <div className="w-full h-full" style={style} key={key}>
              <HumanMessage messageId={-1} content={submittedMessage} />
            </div>
          );
        } else if (chatState === "loading") {
          return (
            <div className="w-full h-full" style={style} key={key}>
              <AIMessage
                currentPersona={liveAssistant}
                alternativeAssistant={
                  alternativeGeneratingAssistant ?? alternativeAssistant
                }
                messageId={null}
                personaName={liveAssistant.name}
                content={
                  <div
                    key={"Generating"}
                    className="mr-auto relative inline-block"
                  >
                    <span className="text-sm loading-text">Thinking...</span>
                  </div>
                }
              />
            </div>
          );
        } else {
          // Add padding element
          return <div className="h-[95px]" style={style} key={key} />;
        }
      }
    };

    return (
      <AutoSizer className="w-full h-full overflow-hidden">
        {({ width, height }: { width: number; height: number }) => (
          <List
            className="h-full overflow-hidden"
            ref={listRef}
            height={height}
            rowCount={messageHistory.length + 1}
            rowHeight={getSize}
            rowRenderer={rowRenderer}
            width={width}
            overscanRowCount={8}
            onRowsRendered={({ startIndex, stopIndex }) => {
              console.log(`Rendering rows from ${startIndex} to ${stopIndex}`);
            }}
          />
        )}
      </AutoSizer>
    );
  }
);

MessageHistory.displayName = "MessageHistory";
