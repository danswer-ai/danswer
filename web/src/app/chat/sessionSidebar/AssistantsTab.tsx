import { Assistant } from "@/app/admin/assistants/interfaces";
import { BasicSelectable } from "@/components/BasicClickable";
import { User } from "@/lib/types";
import { Text } from "@tremor/react";
import { Edit2 } from "lucide-react";
import Link from "next/link";
import { FaRobot } from "react-icons/fa";

function AssistantDisplay({
  assistant,
  onSelect,
  user,
}: {
  assistant: Assistant;
  onSelect: (assistant: Assistant) => void;
  user: User | null;
}) {
  const isEditable =
    (!user || user.id === assistant.owner?.id) &&
    !assistant.default_assistant &&
    (!assistant.is_public || !user || user.role === "admin");

  return (
    <div className="flex">
      <div className="w-full" onClick={() => onSelect(assistant)}>
        <BasicSelectable selected={false} fullWidth>
          <div className="flex">
            <div className="truncate w-48 3xl:w-56 flex">
              <FaRobot className="mr-2 my-auto" size={16} /> {assistant.name}
            </div>
          </div>
        </BasicSelectable>
      </div>
      {isEditable && (
        <div className="pl-2 my-auto">
          <Link href={`/assistants/edit/${assistant.id}`}>
            <Edit2 className="my-auto ml-auto hover:bg-hover p-0.5" size={20} />
          </Link>
        </div>
      )}
    </div>
  );
}

export function AssistantsTab({
  assistants,
  onAssistantChange,
  user,
}: {
  assistants: Assistant[];
  onAssistantChange: (assistant: Assistant | null) => void;
  user: User | null;
}) {
  const globalAssistants = assistants.filter(
    (assistant) => assistant.is_public
  );
  const personalAssistants = assistants.filter(
    (assistant) =>
      (!user || assistant.users.some((u) => u.id === user.id)) &&
      !assistant.is_public
  );

  return (
    <div className="mt-4 pb-1 overflow-y-auto h-full flex flex-col gap-y-1">
      <Text className="mx-3 text-xs mb-4">
        Select an Assistant below to begin a new chat with them!
      </Text>

      <div className="mx-3">
        {globalAssistants.length > 0 && (
          <>
            <div className="text-xs text-subtle flex pb-0.5 ml-1 mb-1.5 font-bold">
              Global
            </div>
            {globalAssistants.map((assistant) => {
              return (
                <AssistantDisplay
                  key={assistant.id}
                  assistant={assistant}
                  onSelect={onAssistantChange}
                  user={user}
                />
              );
            })}
          </>
        )}

        {personalAssistants.length > 0 && (
          <>
            <div className="text-xs text-subtle flex pb-0.5 ml-1 mb-1.5 mt-5 font-bold">
              Assistantl
            </div>
            {personalAssistants.map((assistant) => {
              return (
                <AssistantDisplay
                  key={assistant.id}
                  assistant={assistant}
                  onSelect={onAssistantChange}
                  user={user}
                />
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
