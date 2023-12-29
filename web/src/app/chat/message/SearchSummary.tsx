import {
  BasicClickable,
  EmphasizedClickable,
} from "@/components/BasicClickable";
import { HoverPopup } from "@/components/HoverPopup";
import { DanswerDocument } from "@/lib/search/interfaces";
import { useEffect, useRef, useState } from "react";
import { FiBookOpen, FiCheck, FiEdit, FiEdit2, FiSearch, FiX } from "react-icons/fi";
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

function SearchingForDisplay({
  query,
  isHoverable,
}: {
  query: string;
  isHoverable?: boolean;
}) {
  return (
    <div className={`flex p-1 rounded ${isHoverable && "cursor-default"}`}>
      <FiSearch className="mr-2 my-auto" size={14} />
      <p className="line-clamp-1 break-all xl:w-64 2xl:w-80 3xl:w-96">
        Searching for: <i>{query}</i>
      </p>
    </div>
  );
}

export function SearchSummary({
  query,
  hasDocs,
  messageId,
  isCurrentlyShowingRetrieved,
  handleShowRetrieved,
}: {
  query: string;
  hasDocs: boolean;
  messageId: number | null;
  isCurrentlyShowingRetrieved: boolean;
  handleShowRetrieved: (messageId: number | null) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [finalQuery, setFinalQuery] = useState(query);
  const [isOverflowed, setIsOverflowed] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkOverflow = () => {
      const current = contentRef.current;
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

  const searchingForDisplay = (
    <div className={`flex p-1 rounded ${isOverflowed && "cursor-default"}`}>
      <FiSearch className="mr-2 my-auto" size={14} />
      <div className="line-clamp-1 break-all px-0.5" ref={contentRef}>
        Searching for: <i>{finalQuery}</i>
      </div>
    </div>
  );

  const editInput = (
    <div className="my-2 flex w-full mr-3">
      <input
        value={finalQuery}
        onChange={(e) => setFinalQuery(e.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            setIsEditing(false);
            event.preventDefault();
          }
        }}
        className="px-1 mr-2 w-full rounded border border-border-strong"
      />

      <div className="ml-auto my-auto flex">
        <div
          onClick={() => console.log("hi")}
          className={`hover:bg-black/10 p-1 -m-1 rounded`}
        >
          <FiCheck size={16} />
        </div>
        <div
          onClick={() => {
            setFinalQuery(query);
            setIsEditing(false);
          }}
          className={`hover:bg-black/10 p-1 -m-1 rounded ml-2`}
        >
          <FiX size={16} />
        </div>
      </div>
    </div>
  );

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
          <div className="my-auto">
            <Hoverable onClick={() => setIsEditing(true)}>
              <FiEdit2 className="my-auto" size="14" />
            </Hoverable>
          </div>
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
