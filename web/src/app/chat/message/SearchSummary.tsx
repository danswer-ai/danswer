import {
  BasicClickable,
  EmphasizedClickable,
} from "@/components/BasicClickable";
import { HoverPopup } from "@/components/HoverPopup";
import { DanswerDocument } from "@/lib/search/interfaces";
import { FiBookOpen, FiSearch } from "react-icons/fi";

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
  return (
    <div className="flex">
      <div className="text-sm my-2">
        {query.length >= 40 ? (
          <HoverPopup
            mainContent={<SearchingForDisplay query={query} isHoverable />}
            popupContent={
              <div className="xl:w-64 2xl:w-80 3xl:w-96">
                <b>Full query:</b> <div className="mt-1 italic">{query}</div>
              </div>
            }
            direction="top"
          />
        ) : (
          <SearchingForDisplay query={query} />
        )}
      </div>
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
