import { Badge } from "@/components/ui/badge";
import { Teamspace } from "@/lib/types";
import { BookmarkIcon } from "lucide-react";

interface TeamspaceDocumentSetProps {
  teamspace: Teamspace & { gradient: string };
}

export const TeamspaceDocumentSet = ({
  teamspace,
}: TeamspaceDocumentSetProps) => {
  return (
    <div className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between">
      <h3>
        Document Set <span className="px-2 font-normal">|</span>{" "}
        {teamspace.document_sets.length}
      </h3>

      {teamspace.document_sets.length > 0 ? (
        <div className="pt-4 flex flex-wrap gap-2">
          {teamspace.document_sets.map((documentSet) => {
            return (
              <Badge key={documentSet.id}>
                <BookmarkIcon size={16} />
                {documentSet.name}
              </Badge>
            );
          })}
        </div>
      ) : (
        <p>There are document set.</p>
      )}
    </div>
  );
};
