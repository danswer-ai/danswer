import { EmphasizedClickable } from "@/components/BasicClickable";
import { Button } from "@/components/ui/button";
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
      <Button size="xs" variant="outline">
        <div className="w-24 text-xs">Force Search</div>
      </Button>
    </div>
  );
}

export function SkippedSearch({
  handleForceSearch,
}: {
  handleForceSearch: () => void;
}) {
  return (
    <div className="flex text-sm p-1">
      <FiBook className="my-auto mr-2" size={14} />
      <div className="my-2 cursor-default">
        The AI decided this query didn&apos;t need a search
      </div>

      <div className="ml-auto my-auto" onClick={handleForceSearch}>
        <Button size="xs" variant="outline">
          <div className="w-24 text-xs">Force Search</div>
        </Button>
      </div>
    </div>
  );
}
