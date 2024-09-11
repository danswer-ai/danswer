import { EmphasizedClickable } from "@/components/BasicClickable";
import { HoverPopup } from "@/components/HoverPopup";
import { Search } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { X, Check, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/CustomTooltip";

export function ShowHideDocsButton({
  messageId,
  isCurrentlyShowingRetrieved,
  handleShowRetrieved,
  handleToggleSideBar,
}: {
  messageId: number | null;
  isCurrentlyShowingRetrieved: boolean;
  handleShowRetrieved: (messageId: number | null) => void;
  handleToggleSideBar?: () => void;
}) {
  return (
    <div
      className="ml-auto my-auto"
      onClick={() => handleShowRetrieved(messageId)}
    >
      {isCurrentlyShowingRetrieved ? (
        <Button
          size="xs"
          variant="outline"
          onClick={handleToggleSideBar}
          className="w-24"
        >
          Hide Docs
        </Button>
      ) : (
        <Button
          size="xs"
          variant="outline"
          onClick={handleToggleSideBar}
          className="w-24"
        >
          Show Docs
        </Button>
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
  handleToggleSideBar,
}: {
  query: string;
  hasDocs: boolean;
  messageId: number | null;
  isCurrentlyShowingRetrieved: boolean;
  handleShowRetrieved: (messageId: number | null) => void;
  handleSearchQueryEdit?: (query: string) => void;
  handleToggleSideBar?: () => void;
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

  useEffect(() => {
    if (!isEditing) {
      setFinalQuery(query);
    }
  }, [query]);

  const searchingForDisplay = (
    <div
      className={`flex items-center py-1 rounded ${
        isOverflowed && "cursor-default"
      }`}
    >
      <Search size={16} className="min-w-4 min-h-4 mr-2" />
      <div className="line-clamp-1 break-all px-0.5" ref={searchingForRef}>
        Searching for: <i>{finalQuery}</i>
      </div>
    </div>
  );

  const editInput = handleSearchQueryEdit ? (
    <div className="flex w-full mr-3">
      <div className="my-2 w-full">
        <Input
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
        />
      </div>
      <div className="ml-2 my-auto flex">
        <Button
          onClick={() => {
            if (!finalQuery) {
              setFinalQuery(query);
            } else if (finalQuery !== query) {
              handleSearchQueryEdit(finalQuery);
            }
            setIsEditing(false);
          }}
          variant="ghost"
          size="smallIcon"
        >
          <Check size={16} />
        </Button>
        <Button
          onClick={() => {
            setFinalQuery(query);
            setIsEditing(false);
          }}
          variant="ghost"
          size="smallIcon"
        >
          <X size={16} />
        </Button>
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
              <CustomTooltip trigger={searchingForDisplay} align="start">
                <div className="w-full max-w-96 lg:max-w-screen-md max-h-40 overflow-auto">
                  <b>Full query:</b>{" "}
                  <div className="mt-1 italic w-full">{query}</div>
                </div>
              </CustomTooltip>
            ) : (
              searchingForDisplay
            )}
          </div>
          {handleSearchQueryEdit && (
            <div className="my-auto mx-2">
              <Button
                variant="ghost"
                size="smallIcon"
                onClick={() => setIsEditing(true)}
              >
                <Pencil size={16} />
              </Button>
            </div>
          )}
        </>
      )}
      {hasDocs && (
        <ShowHideDocsButton
          messageId={messageId}
          isCurrentlyShowingRetrieved={isCurrentlyShowingRetrieved}
          handleShowRetrieved={handleShowRetrieved}
          handleToggleSideBar={handleToggleSideBar}
        />
      )}
    </div>
  );
}
