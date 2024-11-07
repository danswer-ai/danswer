"use client";

import { Assistant } from "./interfaces";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { UniqueIdentifier } from "@dnd-kit/core";
import { DraggableTable } from "@/components/table/DraggableTable";
import { deleteAssistant, assistantComparator } from "./lib";
import { Pencil, Trash } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { CustomTooltip } from "@/components/CustomTooltip";
import { useUser } from "@/components/user/UserProvider";
import Link from "next/link";
import { DeleteModal } from "@/components/DeleteModal";

function AssistantTypeDisplay({ assistant }: { assistant: Assistant }) {
  if (assistant.builtin_assistant) {
    return <p className="whitespace-nowrap">Built-In</p>;
  }

  if (assistant.is_public) {
    return <p>Global</p>;
  }

  return <p>Private {assistant.owner && <>({assistant.owner.email})</>}</p>;
}

export function AssistantsTable({
  allAssistants,
  editableAssistants,
  teamspaceId,
}: {
  allAssistants: Assistant[];
  editableAssistants: Assistant[];
  teamspaceId?: string | string[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { isLoadingUser, isAdmin } = useUser();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [assistantToDelete, setAssistantToDelete] = useState<Assistant | null>(
    null
  );

  const editableAssistantIds = useMemo(() => {
    return new Set(editableAssistants.map((p) => p.id.toString()));
  }, [editableAssistants]);

  const sortedAssistants = useMemo(() => {
    const editable = editableAssistants.sort(assistantComparator);
    const nonEditable = allAssistants
      .filter((p) => !editableAssistantIds.has(p.id.toString()))
      .sort(assistantComparator);
    return [...editable, ...nonEditable];
  }, [allAssistants, editableAssistantIds, editableAssistants]);

  const [finalAssistants, setFinalAssistants] = useState<string[]>(
    sortedAssistants.map((assistant) => assistant.id.toString())
  );
  const finalAssistantValues = finalAssistants
    .filter((id) => new Set(allAssistants.map((p) => p.id.toString())).has(id))
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
        title: "Failed to Update Assistant Order",
        description: `There was an issue updating the assistant order. Details: ${await response.text()}`,
        variant: "destructive",
      });
      router.refresh();
    }
  };

  if (isLoadingUser) {
    return <></>;
  }

  return (
    <div>
      {isDeleteModalOpen && assistantToDelete && (
        <DeleteModal
          title={`Are you sure you want to ${teamspaceId ? "remove" : "delete"} this assistant?`}
          description={`This action will permanently schedule the selected assistant will ${teamspaceId ? "remove" : "deletion"}. Please confirm if you want to proceed with this irreversible action.`}
          onClose={() => setIsDeleteModalOpen(false)}
          open={isDeleteModalOpen}
          onSuccess={async () => {
            const response = await deleteAssistant(
              assistantToDelete.id,
              teamspaceId
            );
            if (response.ok) {
              toast({
                title: `Assistant ${teamspaceId ? "removed" : "deleted"}`,
                description: `The assistant has been successfully ${teamspaceId ? "removed" : "deleted"}.`,
                variant: "success",
              });
              setIsDeleteModalOpen(false);
              router.refresh();
            } else {
              toast({
                title: `Failed to ${teamspaceId ? "remove" : "delete"} assistant`,
                description: `There was an issue ${teamspaceId ? "removing" : "deleting"} the assistant. Details: ${await response.text()}`,
                variant: "destructive",
              });
            }
          }}
        />
      )}

      <p className="pb-4 text-sm">
        Assistants will be displayed as options on the Chat / Search interfaces
        in the order they are displayed below. Assistants marked as hidden will
        not be displayed.
      </p>

      <Card>
        <CardContent className="p-0">
          <DraggableTable
            headers={["Name", "Description", "Type", "Is Visible", "Delete"]}
            isAdmin={isAdmin}
            rows={finalAssistantValues.map((assistant) => {
              return {
                id: assistant.id.toString(),
                cells: [
                  <CustomTooltip
                    key="name"
                    trigger={
                      assistant.builtin_assistant ? (
                        <div className="flex items-center w-full gap-2 truncate">
                          <p className="font-medium truncate text break-none">
                            {assistant.name}
                          </p>
                        </div>
                      ) : (
                        <Link
                          href={
                            teamspaceId
                              ? `/t/${teamspaceId}/admin/assistants/${assistant.id}?u=${Date.now()}`
                              : `/admin/assistants/${assistant.id}?u=${Date.now()}`
                          }
                          className="flex items-center w-full gap-2 truncate"
                        >
                          <Pencil size={16} className="shrink-0" />
                          <p className="font-medium truncate text break-none">
                            {assistant.name}
                          </p>
                        </Link>
                      )
                    }
                    align="start"
                    asChild
                  >
                    {assistant.name}
                  </CustomTooltip>,
                  <p key="description" className="max-w-2xl whitespace-normal">
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
                        toast({
                          title: "Visibility Updated",
                          description: `The visibility of "${assistant.name}" has been successfully updated.`,
                          variant: "success",
                        });

                        router.refresh();
                      } else {
                        toast({
                          title: "Failed to Update Assistant Visibility",
                          description: `Unable to update visibility for "${assistant.name}". Details: ${await response.text()}`,
                          variant: "destructive",
                        });
                      }
                    }}
                    variant="outline"
                    className="py-1.5 px-3 w-[84px] cursor-pointer hover:bg-opacity-80 gap-1.5"
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
                      {!assistant.builtin_assistant ? (
                        <CustomTooltip
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setAssistantToDelete(assistant);
                                setIsDeleteModalOpen(true);
                              }}
                            >
                              <Trash size={16} />
                            </Button>
                          }
                          asChild
                          variant="destructive"
                        >
                          Delete
                        </CustomTooltip>
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
