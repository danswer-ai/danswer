import { ConnectorIndexingStatus } from "@/lib/types";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { Badge } from "@/components/ui/badge";
import { Assistant } from "@/app/admin/assistants/interfaces";

interface AssistantsProps {
  assistants: Assistant[];
}

export const Assistants = ({ assistants }: AssistantsProps) => {
  return (
    <div className="mb-3 flex gap-2 flex-wrap">
      {assistants.map((assistant, i) => {
        return (
          <Badge
            key={i}
            className="cursor-pointer hover:bg-opacity-80"
            variant="outline"
          >
            {assistant.name}
          </Badge>
        );
      })}
    </div>
  );
};
