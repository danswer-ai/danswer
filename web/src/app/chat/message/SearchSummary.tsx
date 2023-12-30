import {
  BasicClickable,
  EmphasizedClickable,
} from "@/components/BasicClickable";
import { HoverPopup } from "@/components/HoverPopup";
import { useEffect, useRef, useState } from "react";
import { FiCheck, FiEdit2, FiSearch, FiX } from "react-icons/fi";
import { Hoverable } from "./Messages";

export function ShowHideDocsButton({
  messageId,
  isCurrentlyShowingRetrieved,
  handleShowRetrieved,
}: {
  messageId: number | null;
  isCurrentlyShowingRetrieved: boolean;
  handleShowRetrieved: (messageId: number | null) => void;
}) {
  return (
    <div
      className="ml-auto my-auto"
      onClick={() => handleShowRetrieved(messageId)}
    >
      {isCurrentlyShowingRetrieved ? (
        <EmphasizedClickable>
          <div className="w-24 text-xs">Hide Docs</div>
        </EmphasizedClickable>
      ) : (
        <BasicClickable>
          <div className="w-24 text-xs">Show Docs</div>
        </BasicClickable>
      )}
    </div>
  );
}

export function SearchSummary({
  query,
  hasDocs,
  messageId,
  isCurrentlyShowingRetrieved,
  handleShowRetrieved,
  handleSearchQueryEdit,
}: {
  query: string;
  hasDocs: boolean;
  messageId: number | null;
  isCurrentlyShowingRetrieved: boolean;
  handleShowRetrieved: (messageId: number | null) => void;
  handleSearchQueryEdit?: (query: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [finalQuery, setFinalQuery] = useState(query);
  const [isOverflowed, setIsOverflowed] = useState(false);
  const searchingForRef = useRef<HTMLDivElement>(null);
  const editQueryRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      const current = searchingForRef.current;
      if (current) {
        setIsOverflowed(
          current.scrollWidth > current.clientWidth ||
            current.scrollHeight > current.clientHeight
        );
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow); // Recheck on window resize

    return () => window.removeEventListener("resize", checkOverflow);
  }, []);

  useEffect(() => {
    if (isEditing && editQueryRef.current) {
      editQueryRef.current.focus();
    }
  }, [isEditing]);

  const searchingForDisplay = (
    <div className={`flex p-1 rounded ${isOverflowed && "cursor-default"}`}>
      <FiSearch className="mr-2 my-auto" size={14} />
      <div className="line-clamp-1 break-all px-0.5" ref={searchingForRef}>
        Searching for: <i>{finalQuery}</i>
      </div>
    </div>
  );

  const editInput = handleSearchQueryEdit ? (
    <div className="flex w-full mr-3">
      <div className="my-2 w-full">
        <input
          ref={editQueryRef}
          value={finalQuery}
          onChange={(e) => setFinalQuery(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              setIsEditing(false);
              if (!finalQuery) {
                setFinalQuery(query);
              } else if (finalQuery !== query) {
                handleSearchQueryEdit(finalQuery);
              }
              event.preventDefault();
            } else if (event.key === "Escape") {
              setFinalQuery(query);
              setIsEditing(false);
              event.preventDefault();
            }
          }}
          className="px-1 py-0.5 h-[28px] text-sm mr-2 w-full rounded-sm border border-border-strong"
        />
      </div>
      <div className="ml-2 my-auto flex">
        <div
          onClick={() => {
            if (!finalQuery) {
              setFinalQuery(query);
            } else if (finalQuery !== query) {
              handleSearchQueryEdit(finalQuery);
            }
            setIsEditing(false);
          }}
          className={`hover:bg-black/10 p-1 -m-1 rounded`}
        >
          <FiCheck size={14} />
        </div>
        <div
          onClick={() => {
            setFinalQuery(query);
            setIsEditing(false);
          }}
          className={`hover:bg-black/10 p-1 -m-1 rounded ml-2`}
        >
          <FiX size={14} />
        </div>
      </div>
    </div>
  ) : null;

  return (
    <div className="flex">
      {isEditing ? (
        editInput
      ) : (
        <>
          <div className="text-sm my-2">
            {isOverflowed ? (
              <HoverPopup
                mainContent={searchingForDisplay}
                popupContent={
                  <div>
                    <b>Full query:</b>{" "}
                    <div className="mt-1 italic">{query}</div>
                  </div>
                }
                direction="top"
              />
            ) : (
              searchingForDisplay
            )}
          </div>
          {handleSearchQueryEdit && (
            <div className="my-auto">
              <Hoverable onClick={() => setIsEditing(true)}>
                <FiEdit2 className="my-auto" size="14" />
              </Hoverable>
            </div>
          )}
        </>
      )}
      {hasDocs && (
        <ShowHideDocsButton
          messageId={messageId}
          isCurrentlyShowingRetrieved={isCurrentlyShowingRetrieved}
          handleShowRetrieved={handleShowRetrieved}
        />
      )}
    </div>
  );
}
