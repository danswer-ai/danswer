import { Button } from "@/components/ui/button";
import { Book } from "lucide-react";

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
    <div className="flex text-sm py-1 items-center">
      <Book className="my-auto mr-2 shrink-0" size={14} />
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
