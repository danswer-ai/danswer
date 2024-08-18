import { EmphasizedClickable } from "@/components/BasicClickable";
import { FiArchive, FiBook, FiSearch } from "react-icons/fi";

function ForceSearchButton({
  messageId,
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
      <EmphasizedClickable>
        <div className="w-24 text-xs">Force Search</div>
      </EmphasizedClickable>
    </div>
  );
}

export function SkippedSearch({
  handleForceSearch,
}: {
  handleForceSearch: () => void;
}) {
  return (
    <div className="flex group-hover:text-text-900 text-text-500 text-sm !pt-0 p-1">
      <div className="flex mb-auto">
        <span className="mobile:hidden">
          The AI decided this query didn&apos;t need a search
        </span>
        <span className="desktop:hidden">No search</span>
      </div>

      <div className="ml-auto my-auto" onClick={handleForceSearch}>
        <EmphasizedClickable size="sm">
          <div className="w-24 text-xs">Force Search</div>
        </EmphasizedClickable>
      </div>
    </div>
  );
}
