"use client";

import { Assistant } from "./interfaces";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { UniqueIdentifier } from "@dnd-kit/core";
import { DraggableTable } from "@/components/table/DraggableTable";
import { deleteAssistant, assistantComparator } from "./lib";
import { TrashIcon } from "@/components/icons/icons";
import { Pencil } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

function AssistantTypeDisplay({ assistant }: { assistant: Assistant }) {
  if (assistant.default_assistant) {
    return <p>Built-In</p>;
  }

  if (assistant.is_public) {
    return <p>Global</p>;
  }

  return <p>Assistantl {assistant.owner && <>({assistant.owner.email})</>}</p>;
}

export function AssistantsTable({ assistants }: { assistants: Assistant[] }) {
  const router = useRouter();
  const { toast } = useToast();

  const availableAssistantIds = new Set(
    assistants.map((assistant) => assistant.id.toString())
  );
  const sortedAssistants = [...assistants];
  sortedAssistants.sort(assistantComparator);

  const [finalAssistants, setFinalAssistants] = useState<string[]>(
    sortedAssistants.map((assistant) => assistant.id.toString())
  );
  const finalAssistantValues = finalAssistants
    .filter((id) => availableAssistantIds.has(id))
    .map((id) => {
      return sortedAssistants.find(
        (assistant) => assistant.id.toString() === id
      ) as Assistant;
    });

  const updateAssistantOrder = async (
    orderedAssistantIds: UniqueIdentifier[]
  ) => {
    setFinalAssistants(orderedAssistantIds.map((id) => id.toString()));

    const displayPriorityMap = new Map<UniqueIdentifier, number>();
    orderedAssistantIds.forEach((assistantId, ind) => {
      displayPriorityMap.set(assistantId, ind);
    });

    const response = await fetch("/api/admin/assistant/display-priority", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        display_priority_map: Object.fromEntries(displayPriorityMap),
      }),
    });
    if (!response.ok) {
      toast({
        title: "Error",
        description: `Failed to update assistant order - ${await response.text()}`,
        variant: "destructive",
      });
      router.refresh();
    }
  };

  return (
    <div>
      <p className="pb-6">
        Assistants will be displayed as options on the Chat / Search interfaces
        in the order they are displayed below. Assistants marked as hidden will
        not be displayed.
      </p>

      <Card>
        <CardContent className="p-0">
          <DraggableTable
            headers={["Name", "Description", "Type", "Is Visible", "Delete"]}
            rows={finalAssistantValues.map((assistant) => {
              return {
                id: assistant.id.toString(),
                cells: [
                  <div key="name" className="flex gap-2 items-center">
                    {!assistant.default_assistant && (
                      <Button variant="ghost" size="icon">
                        <Pencil
                          size={16}
                          onClick={() =>
                            router.push(
                              `/admin/assistants/${
                                assistant.id
                              }?u=${Date.now()}`
                            )
                          }
                        />
                      </Button>
                    )}
                    <p className="text font-medium whitespace-normal break-none">
                      {assistant.name}
                    </p>
                  </div>,
                  <p
                    key="description"
                    className="whitespace-normal break-all max-w-2xl"
                  >
                    {assistant.description}
                  </p>,
                  <AssistantTypeDisplay
                    key={assistant.id}
                    assistant={assistant}
                  />,
                  <Badge
                    key="is_visible"
                    onClick={async () => {
                      const response = await fetch(
                        `/api/admin/assistant/${assistant.id}/visible`,
                        {
                          method: "PATCH",
                          headers: {
                            "Content-Type": "application/json",
                          },
                          body: JSON.stringify({
                            is_visible: !assistant.is_visible,
                          }),
                        }
                      );
                      if (response.ok) {
                        router.refresh();
                      } else {
                        toast({
                          title: "Error",
                          description: `Failed to update assistant - ${await response.text()}`,
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    className="py-1.5 px-3 w-[84px] cursor-pointer hover:opacity-80 gap-1.5"
                  >
                    {!assistant.is_visible ? (
                      <div className="text-error">Hidden</div>
                    ) : (
                      "Visible"
                    )}

                    <Checkbox checked={assistant.is_visible} />
                  </Badge>,
                  <div key="edit" className="flex">
                    <div className="mx-auto my-auto">
                      {!assistant.default_assistant ? (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={async () => {
                            const response = await deleteAssistant(
                              assistant.id
                            );
                            if (response.ok) {
                              router.refresh();
                            } else {
                              alert(
                                `Failed to delete assistant - ${await response.text()}`
                              );
                            }
                          }}
                        >
                          <TrashIcon />
                        </Button>
                      ) : (
                        "-"
                      )}
                    </div>
                  </div>,
                ],
                staticModifiers: [
                  [1, "lg:w-sidebar xl:w-[400px] 2xl:w-[550px]"],
                ],
              };
            })}
            setRows={updateAssistantOrder}
          />
        </CardContent>
      </Card>
    </div>
  );
}
