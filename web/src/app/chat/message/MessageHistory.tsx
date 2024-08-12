import { List, AutoSizer } from "react-virtualized";

import { useRef, useEffect, useCallback } from "react";

import { MessageRouter } from "./MessageRouter";
import { MessageHistoryProps } from "./types";
import { debounce } from "lodash";

export const MessageHistory: React.FC<MessageHistoryProps> = ({
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
  createRegenerator,
  regenerationState,
  chatState,
}) => {
  const sizeMap = useRef<{ [key: number]: number }>({});
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<List>(null);

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
  }, [messageHistory]);

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

  const rowRenderer = ({ index, key, style }: any) => (
    <div style={style} key={key}>
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

  return (
    <div
      className={`flex-grow  max-h-[80] overflow-visible`}
      ref={containerRef}
    >
      <AutoSizer className="h-full">
        {({ width, height }: { width: number; height: number }) => (
          <List
            className="h-full"
            ref={listRef}
            height={height}
            rowCount={messageHistory.length}
            rowHeight={getSize}
            rowRenderer={rowRenderer}
            width={width}
            overscanRowCount={2}
            onRowsRendered={({ startIndex, stopIndex }) => {
              console.log(`Rendering rows from ${startIndex} to ${stopIndex}`);
            }}
          />
        )}
      </AutoSizer>
      {/* Some padding at the bottom so the search bar has space at the bottom to not cover the last message*/}
    </div>
  );
};
