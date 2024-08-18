/* import { StarterMessage } from "../admin/assistants/interfaces";

export function StarterMessage({
  starterMessage,
  onClick,
}: {
  starterMessage: StarterMessage;
  onClick: () => void;
}) {
  return (
    <div
      className={
        "py-2 px-3 rounded border border-border bg-white cursor-pointer hover:bg-hover-light h-full"
      }
      onClick={onClick}
    >
      <p className="font-medium text-emphasis">{starterMessage.name}</p>
      <p className="text-subtle text-sm">{starterMessage.description}</p>
    </div>
  );
} */
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { StarterMessage as StarterMessageType } from "../admin/assistants/interfaces";
import { ChevronsLeftRight } from "lucide-react";

export function StarterMessage({
  starterMessage,
  onClick,
}: {
  starterMessage: StarterMessageType;
  onClick: () => void;
}) {
  return (
    <Card
      className="h-[180px] p-4 justify-between flex flex-col cursor-pointer border-input-colored"
      onClick={onClick}
    >
      <CardContent className="p-0 text-default">
        <p className="text-subtle text-sm">{starterMessage.description}</p>
      </CardContent>{" "}
      <CardFooter className="p-0">
        <ChevronsLeftRight size={24} className="ml-auto" />
      </CardFooter>
    </Card>
  );
}
