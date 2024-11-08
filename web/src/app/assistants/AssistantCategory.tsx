import { Badge } from "@/components/ui/badge";
import { PersonaCategory } from "../admin/assistants/interfaces";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function AssistantCategory({
  assistantCategory,
}: {
  assistantCategory: PersonaCategory;
}) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger className="cursor-help">
          <Badge variant="purple">{assistantCategory.name}</Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{assistantCategory.description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
