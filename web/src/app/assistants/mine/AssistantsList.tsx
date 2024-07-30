"use client";

import { useState } from "react";
import { MinimalUserSnapshot, User } from "@/lib/types";
import { Persona } from "@/app/admin/assistants/interfaces";
import { Divider, Text } from "@tremor/react";
import {
  FiArrowDown,
  FiArrowUp,
  FiEdit2,
  FiMoreHorizontal,
  FiPlus,
  FiSearch,
  FiX,
  FiShare2,
  FiImage,
} from "react-icons/fi";
import Link from "next/link";
import { orderAssistantsForUser } from "@/lib/assistants/orderAssistants";
import {
  addAssistantToList,
  moveAssistantUp,
  removeAssistantFromList,
} from "@/lib/assistants/updateAssistantPreferences";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { DefaultPopover } from "@/components/popover/DefaultPopover";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { useRouter } from "next/navigation";
import { NavigationButton } from "../NavigationButton";
import { AssistantsPageTitle } from "../AssistantsPageTitle";
import { checkUserOwnsAssistant } from "@/lib/assistants/checkOwnership";
import { AssistantSharingModal } from "./AssistantSharingModal";
import { AssistantSharedStatusDisplay } from "../AssistantSharedStatus";
import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { AssistantTools } from "../ToolsDisplay";

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { DragHandle } from "@/components/table/DragHandle";

function DraggableAssistantListItem(props: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.assistant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.8 : 1,
    zIndex: isDragging ? 1000 : "auto",
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="flex items-center">
        <div>
          <DragHandle />
        </div>
        <div className="flex-grow">
          <AssistantListItem {...props} />
        </div>
      </div>
    </div>
  );
}

function AssistantListItem({
  assistant,
  user,
  allAssistantIds,
  allUsers,
  isFirst,
  isLast,
  isVisible,
  setPopup,
}: {
  assistant: Persona;
  user: User | null;
  allUsers: MinimalUserSnapshot[];
  allAssistantIds: number[];
  isFirst: boolean;
  isLast: boolean;
  isVisible: boolean;
  setPopup: (popupSpec: PopupSpec | null) => void;
}) {
  const router = useRouter();
  const [showSharingModal, setShowSharingModal] = useState(false);

  const currentChosenAssistants = user?.preferences?.chosen_assistants;
  const isOwnedByUser = checkUserOwnsAssistant(user, assistant);

  return (
    <>
      <AssistantSharingModal
        assistant={assistant}
        user={user}
        allUsers={allUsers}
        onClose={() => {
          setShowSharingModal(false);
          router.refresh();
        }}
        show={showSharingModal}
      />
      <div
        className="flex bg-background-emphasis
          rounded-lg
          shadow-md
          p-4
          mb-4 flex-col"
      >
        <div
          className="
          
          flex
          justify-between
          items-center
        "
        >
          <div className="w-3/4">
            <div className="flex items-center">
              <AssistantIcon assistant={assistant} />
              <h2 className="text-xl font-semibold my-auto ml-2">
                {assistant.name}
              </h2>
            </div>

            <div className="text-sm mt-2">{assistant.description}</div>
            <div className="mt-2 flex items-start gap-y-2 flex-col  gap-x-3">
              <AssistantSharedStatusDisplay assistant={assistant} user={user} />
              {assistant.tools.length != 0 && (
                <AssistantTools list assistant={assistant} />
              )}
            </div>
          </div>

          {isOwnedByUser && (
            <div className="ml-auto flex items-center">
              {!assistant.is_public && (
                <div
                  className="mr-4 rounded p-2 cursor-pointer hover:bg-hover"
                  onClick={() => setShowSharingModal(true)}
                >
                  <FiShare2 size={16} />
                </div>
              )}
              <Link
                href={`/assistants/edit/${assistant.id}`}
                className="mr-4 rounded p-2 cursor-pointer hover:bg-hover"
              >
                <FiEdit2 size={16} />
              </Link>
            </div>
          )}

          <DefaultPopover
            content={
              <div className="hover:bg-hover rounded p-2 cursor-pointer">
                <FiMoreHorizontal size={16} />
              </div>
            }
            side="bottom"
            align="start"
            sideOffset={5}
          >
            {[
              ...(!isFirst
                ? [
                    <div
                      key="move-up"
                      className="flex items-center gap-x-2"
                      onClick={async () => {
                        const success = await moveAssistantUp(
                          assistant.id,
                          currentChosenAssistants || allAssistantIds
                        );
                        if (success) {
                          setPopup({
                            message: `"${assistant.name}" has been moved up.`,
                            type: "success",
                          });
                          router.refresh();
                        } else {
                          setPopup({
                            message: `"${assistant.name}" could not be moved up.`,
                            type: "error",
                          });
                        }
                      }}
                    >
                      <FiArrowUp /> Move Up
                    </div>,
                  ]
                : []),
              ...(!isLast
                ? [
                    <div
                      key="move-down"
                      className="flex items-center gap-x-2"
                      onClick={async () => {
                        const success = await moveAssistantDown(
                          assistant.id,
                          currentChosenAssistants || allAssistantIds
                        );
                        if (success) {
                          setPopup({
                            message: `"${assistant.name}" has been moved down.`,
                            type: "success",
                          });
                          router.refresh();
                        } else {
                          setPopup({
                            message: `"${assistant.name}" could not be moved down.`,
                            type: "error",
                          });
                        }
                      }}
                    >
                      <FiArrowDown /> Move Down
                    </div>,
                  ]
                : []),
              isVisible ? (
                <div
                  key="remove"
                  className="flex items-center gap-x-2"
                  onClick={async () => {
                    if (
                      currentChosenAssistants &&
                      currentChosenAssistants.length === 1
                    ) {
                      setPopup({
                        message: `Cannot remove "${assistant.name}" - you must have at least one assistant.`,
                        type: "error",
                      });
                      return;
                    }

                    const success = await removeAssistantFromList(
                      assistant.id,
                      currentChosenAssistants || allAssistantIds
                    );
                    if (success) {
                      setPopup({
                        message: `"${assistant.name}" has been removed from your list.`,
                        type: "success",
                      });
                      router.refresh();
                    } else {
                      setPopup({
                        message: `"${assistant.name}" could not be removed from your list.`,
                        type: "error",
                      });
                    }
                  }}
                >
                  <FiX /> {isOwnedByUser ? "Hide" : "Remove"}
                </div>
              ) : (
                <div
                  key="add"
                  className="flex items-center gap-x-2"
                  onClick={async () => {
                    const success = await addAssistantToList(
                      assistant.id,
                      currentChosenAssistants || allAssistantIds
                    );
                    if (success) {
                      setPopup({
                        message: `"${assistant.name}" has been added to your list.`,
                        type: "success",
                      });
                      router.refresh();
                    } else {
                      setPopup({
                        message: `"${assistant.name}" could not be added to your list.`,
                        type: "error",
                      });
                    }
                  }}
                >
                  <FiPlus /> Add
                </div>
              ),
            ]}
          </DefaultPopover>
        </div>
      </div>
    </>
  );
}

interface AssistantsListProps {
  user: User | null;
  assistants: Persona[];
}

export async function updateAssistantOrder(
  newOrder: number[]
): Promise<boolean> {
  try {
    const response = await fetch("/api/user/assistant-list", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chosen_assistants: newOrder }),
    });
    return response.ok;
  } catch (error) {
    console.error("Failed to update assistant order:", error);
    return false;
  }
}
async function updateUserAssistantList(
  chosenAssistants: number[]
): Promise<boolean> {
  const response = await fetch("/api/user/assistant-list", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chosen_assistants: chosenAssistants }),
  });

  return response.ok;
}

export async function moveAssistantDown(
  assistantId: number,
  chosenAssistants: number[]
): Promise<boolean> {
  const index = chosenAssistants.indexOf(assistantId);
  if (index < chosenAssistants.length - 1) {
    [chosenAssistants[index + 1], chosenAssistants[index]] = [
      chosenAssistants[index],
      chosenAssistants[index + 1],
    ];
    return updateUserAssistantList(chosenAssistants);
  }
  return false;
}

export function AssistantsList({ user, assistants }: AssistantsListProps) {
  const [filteredAssistants, setFilteredAssistants] = useState(
    orderAssistantsForUser(assistants, user)
  );

  const ownedButHiddenAssistants = assistants.filter(
    (assistant) =>
      checkUserOwnsAssistant(user, assistant) &&
      user?.preferences?.chosen_assistants &&
      !user?.preferences?.chosen_assistants?.includes(assistant.id)
  );
  const allAssistantIds = assistants.map((assistant) => assistant.id);

  const { popup, setPopup } = usePopup();
  const router = useRouter();

  const { data: users } = useSWR<MinimalUserSnapshot[]>(
    "/api/users",
    errorHandlingFetcher
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setFilteredAssistants((assistants) => {
        const oldIndex = assistants.findIndex((a) => a.id === active.id);
        const newIndex = assistants.findIndex((a) => a.id === over.id);

        const newAssistants = arrayMove(assistants, oldIndex, newIndex);

        // Update the order in the backend
        updateUserAssistantList(newAssistants.map((a) => a.id));

        return newAssistants;
      });
    }
  }

  return (
    <>
      {popup}
      <div className="mx-auto mobile:w-[90%] desktop:w-searchbar-xs 2xl:w-searchbar-sm 3xl:w-searchbar">
        <AssistantsPageTitle>My Assistants</AssistantsPageTitle>

        <div className="grid grid-cols-2 gap-4 mt-3">
          <Link href="/assistants/new">
            <NavigationButton>
              <div className="flex justify-center">
                <FiPlus className="mr-2 my-auto" size={20} />
                Create New Assistant
              </div>
            </NavigationButton>
          </Link>

          <Link href="/assistants/gallery">
            <NavigationButton>
              <div className="flex justify-center">
                <FiSearch className="mr-2 my-auto" size={20} />
                View Available Assistants
              </div>
            </NavigationButton>
          </Link>
        </div>

        <p className="mt-6 text-center text-base">
          Assistants allow you to customize your experience for a specific
          purpose. Specifically, they combine instructions, extra knowledge, and
          any combination of tools.
        </p>

        <Divider />

        <h3 className="text-xl font-bold mb-4">Active Assistants</h3>

        <Text>
          The order the assistants appear below will be the order they appear in
          the Assistants dropdown. The first assistant listed will be your
          default assistant when you start a new chat. Drag and drop to reorder.
        </Text>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={filteredAssistants.map((a) => a.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="w-full p-4 mt-3">
              {filteredAssistants.map((assistant, index) => (
                <DraggableAssistantListItem
                  key={assistant.id}
                  assistant={assistant}
                  user={user}
                  allAssistantIds={allAssistantIds}
                  allUsers={users || []}
                  isFirst={false}
                  isLast={index === filteredAssistants.length - 1}
                  isVisible
                  setPopup={setPopup}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        {ownedButHiddenAssistants.length > 0 && (
          <>
            <Divider />

            <h3 className="text-xl font-bold mb-4">Your Hidden Assistants</h3>

            <Text>
              Assistants you&apos;ve created that aren&apos;t currently visible
              in the Assistants selector.
            </Text>

            <div className="w-full p-4">
              {ownedButHiddenAssistants.map((assistant, index) => (
                <AssistantListItem
                  key={assistant.id}
                  assistant={assistant}
                  user={user}
                  allAssistantIds={allAssistantIds}
                  allUsers={users || []}
                  isFirst={index === 0}
                  isLast={index === ownedButHiddenAssistants.length - 1}
                  isVisible={false}
                  setPopup={setPopup}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}
