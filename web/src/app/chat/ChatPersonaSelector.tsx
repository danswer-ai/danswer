import { Assistant } from "@/app/admin/assistants/interfaces";
import { FiCheck, FiChevronDown, FiPlusSquare, FiEdit2 } from "react-icons/fi";
import { CustomDropdown, DefaultDropdownElement } from "@/components/Dropdown";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { checkUserIdOwnsAssistant } from "@/lib/assistants/checkOwnership";

function AssistantItem({
  id,
  name,
  onSelect,
  isSelected,
  isOwner,
}: {
  id: number;
  name: string;
  onSelect: (assistantId: number) => void;
  isSelected: boolean;
  isOwner: boolean;
}) {
  return (
    <div className="flex w-full">
      <div
        key={id}
        className={`
          flex
          flex-grow
          px-3 
          text-sm 
          py-2 
          my-0.5
          rounded
          mx-1
          select-none 
          cursor-pointer 
          
          bg-background
          hover:bg-hover-light
          ${isSelected ? "bg-hover text-selected-emphasis" : ""}
        `}
        onClick={() => {
          onSelect(id);
        }}
      >
        {name}
        {isSelected && (
          <div className="my-auto ml-auto mr-1">
            <FiCheck />
          </div>
        )}
      </div>
      {isOwner && (
        <Link href={`/assistants/edit/${id}`} className="mx-2 my-auto">
          <FiEdit2 className="hover:bg-hover p-0.5 my-auto" size={20} />
        </Link>
      )}
    </div>
  );
}

export function ChatAssistantSelector({
  assistants,
  selectedAssistantId,
  onAssistantChange,
  userId,
}: {
  assistants: Assistant[];
  selectedAssistantId: number | null;
  onAssistantChange: (assistant: Assistant | null) => void;
  userId: string | undefined;
}) {
  const router = useRouter();

  const currentlySelectedAssistant = assistants.find(
    (assistant) => assistant.id === selectedAssistantId
  );

  return (
    <CustomDropdown
      dropdown={
        <div
          className={`
            border 
            border-border 
            bg-background
            rounded-regular 
            shadow-lg 
            flex 
            flex-col 
            w-64 
            max-h-96 
            overflow-y-auto 
            p-1
            overscroll-contain`}
        >
          {assistants.map((assistant) => {
            const isSelected = assistant.id === selectedAssistantId;
            const isOwner = checkUserIdOwnsAssistant(userId, assistant);
            return (
              <AssistantItem
                key={assistant.id}
                id={assistant.id}
                name={assistant.name}
                onSelect={(clickedAssistantId) => {
                  const clickedAssistant = assistants.find(
                    (assistant) => assistant.id === clickedAssistantId
                  );
                  if (clickedAssistant) {
                    onAssistantChange(clickedAssistant);
                  }
                }}
                isSelected={isSelected}
                isOwner={isOwner}
              />
            );
          })}

          <div className="pt-2 border-t border-border">
            <DefaultDropdownElement
              name={
                <div className="flex items-center">
                  <FiPlusSquare className="mr-2" />
                  New Assistant
                </div>
              }
              onSelect={() => router.push("/assistants/new")}
              isSelected={false}
            />
          </div>
        </div>
      }
    >
      <div className="inline-flex px-2 text-xl font-bold rounded cursor-pointer select-none text-strong hover:bg-hover-light">
        <div className="mt-auto">
          {currentlySelectedAssistant?.name || "Default"}
        </div>
        <FiChevronDown className="my-auto ml-1" />
      </div>
    </CustomDropdown>
  );
}
