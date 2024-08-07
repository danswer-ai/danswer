import {
  BasicClickable,
  EmphasizedClickable,
} from "@/components/BasicClickable";
import { HoverPopup } from "@/components/HoverPopup";
import { Hoverable } from "@/components/Hoverable";
import { InternetSearchIcon } from "@/components/InternetSearchIcon";
import { SourceIcon } from "@/components/SourceIcon";
import { ChevronDownIcon, InfoIcon } from "@/components/icons/icons";
import { DocumentMetadataBlock } from "@/components/search/DocumentDisplay";
import { Citation } from "@/components/search/results/Citation";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Tooltip } from "@/components/tooltip/Tooltip";
import {
  DanswerDocument,
  FilteredDanswerDocument,
} from "@/lib/search/interfaces";
import { ValidSources } from "@/lib/types";
import { useContext, useEffect, useRef, useState } from "react";
import { FiCheck, FiEdit2, FiSearch, FiX } from "react-icons/fi";
import { DownChevron } from "react-select/dist/declarations/src/components/indicators";

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
  filteredDocs,
  finished,
  docs,
  toggleDocumentSelection,
  handleSearchQueryEdit,
}: {
  toggleDocumentSelection?: () => void;
  docs?: DanswerDocument[] | null;
  filteredDocs: FilteredDanswerDocument[];
  finished: boolean;
  query: string;
  handleSearchQueryEdit?: (query: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [finalQuery, setFinalQuery] = useState(query);
  const [isOverflowed, setIsOverflowed] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchingForRef = useRef<HTMLDivElement | null>(null);
  const editQueryRef = useRef<HTMLInputElement | null>(null);

  const settings = useContext(SettingsContext);

  const uniqueSourceTypes = Array.from(
    new Set((docs || []).map((doc) => doc.source_type))
  ).slice(0, 3);

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

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
    window.addEventListener("resize", checkOverflow);

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
      className={`flex my-auto items-center ${isOverflowed && "cursor-default"}`}
    >
      {finished ? (
        <>
          <div
            onClick={() => {
              toggleDropdown();
            }}
            className={`!text-sm group-hover:text-text-900 text-text-500 !line-clamp-1 !break-all pr-0.5`}
            ref={searchingForRef}
          >
            Searched {filteredDocs.length > 0 && filteredDocs.length} document
            {filteredDocs.length != 1 && "s"}
          </div>
        </>
      ) : (
        <div
          className={`loading-text !text-sm !line-clamp-1 !break-all px-0.5`}
          ref={searchingForRef}
        >
          Searching for: <i> {finalQuery}</i>
        </div>
      )}
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
        <Hoverable
          icon={FiCheck}
          onClick={() => {
            if (!finalQuery) {
              setFinalQuery(query);
            } else if (finalQuery !== query) {
              handleSearchQueryEdit(finalQuery);
            }
            setIsEditing(false);
          }}
        />
        <Hoverable
          icon={FiX}
          onClick={() => {
            setFinalQuery(query);
            setIsEditing(false);
          }}
        />
      </div>
    </div>
  ) : null;
  const SearchBlock = ({ doc, ind }: { doc: DanswerDocument; ind: number }) => {
    return (
      <div
        onClick={() => {
          if (toggleDocumentSelection) {
            toggleDocumentSelection();
          }
        }}
        key={doc.document_id}
        className={`flex items-start gap-3 px-4 py-3 text-token-text-secondary ${ind == 0 && "rounded-t-xl"} hover:bg-background-100 group relative text-sm`}
        // className="w-full text-sm flex transition-all duration-500 hover:bg-background-125 bg-text-100 py-4 border-b"
      >
        <div className="mt-1 scale-[.9] flex-none">
          {doc.is_internet ? (
            <InternetSearchIcon url={doc.link} />
          ) : (
            <SourceIcon sourceType={doc.source_type} iconSize={18} />
          )}
        </div>
        <div className="flex flex-col">
          <a
            href={doc.link}
            target="_blank"
            className="line-clamp-1 text-text-900"
          >
            {/* <Citation link={doc.link} index={ind + 1} /> */}
            <p className="shrink truncate ellipsis break-all ">
              {doc.semantic_identifier || doc.document_id}
            </p>
            <p className="line-clamp-3 text-text-500 break-words">
              {doc.blurb}
            </p>
          </a>
          {/* <div className="flex overscroll-x-scroll mt-.5">
            <DocumentMetadataBlock document={doc} />
          </div> */}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="flex gap-x-2 group">
        {isEditing ? (
          editInput
        ) : (
          <>
            <div className="my-auto text-sm">
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
              <Tooltip delayDuration={1000} content={"Edit Search"}>
                <button
                  className="my-auto cursor-pointer rounded"
                  onClick={() => {
                    setIsEditing(true);
                  }}
                >
                  <FiEdit2 />
                </button>
              </Tooltip>
            )}
            <button
              className="my-auto hover:bg-hover rounded"
              onClick={toggleDropdown}
            >
              <ChevronDownIcon
                className={`transform transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
              />
            </button>
          </>
        )}
      </div>

      {isDropdownOpen && docs && docs.length > 0 && (
        <div
          className={`mt-2 -mx-8 w-full mb-4 flex relative transition-all duration-300 ${isDropdownOpen ? "opacity-100 max-h-[1000px]" : "opacity-0 max-h-0"}`}
        >
          <div className="w-full">
            <div className="mx-8 flex rounded overflow-hidden rounded-lg border-1.5 border  divide-y divider-y-1.5 divider-y-border border-border flex-col gap-x-4">
              {!settings?.isMobile &&
                filteredDocs.length > 0 &&
                filteredDocs
                  .slice(0, 2)
                  .map((doc, ind) => (
                    <SearchBlock key={ind} doc={doc} ind={ind} />
                  ))}

              <div
                onClick={() => {
                  if (toggleDocumentSelection) {
                    toggleDocumentSelection();
                  }
                }}
                key={-1}
                className="cursor-pointer w-full flex transition-all duration-500 hover:bg-background-100  py-3 border-b"
              >
                <div key={0} className="px-3 invisible scale-[.9] flex-none">
                  <SourceIcon sourceType={"file"} iconSize={18} />
                </div>
                <div className="text-sm flex justify-between text-text-900">
                  <p className="line-clamp-1">See context</p>
                  <div className="flex gap-x-1"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
