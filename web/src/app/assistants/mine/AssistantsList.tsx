"use client";

import { useState } from "react";
import { MinimalUserSnapshot, User } from "@/lib/types";
import { Assistant } from "@/app/admin/assistants/interfaces";
import Link from "next/link";
import { orderAssistantsForUser } from "@/lib/assistants/orderAssistants";
import {
  addAssistantToList,
  moveAssistantDown,
  moveAssistantUp,
  removeAssistantFromList,
} from "@/lib/assistants/updateAssistantPreferences";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";
import { DefaultPopover } from "@/components/popover/DefaultPopover";
import { useRouter } from "next/navigation";
import { NavigationButton } from "../NavigationButton";
import { AssistantsPageTitle } from "../AssistantsPageTitle";
import { checkUserOwnsAssistant } from "@/lib/assistants/checkOwnership";
import { AssistantSharingModal } from "./AssistantSharingModal";
import { AssistantSharedStatusDisplay } from "../AssistantSharedStatus";
import useSWR from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ToolsDisplay } from "../ToolsDisplay";
import { useToast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowDown,
  ArrowUp,
  Ellipsis,
  Pen,
  Plus,
  Search,
  Share2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Divider } from "@/components/Divider";

function AssistantListItem({
  assistant,
  user,
  allAssistantIds,
  allUsers,
  isFirst,
  isLast,
  isVisible,
}: {
  assistant: Assistant;
  user: User | null;
  allUsers: MinimalUserSnapshot[];
  allAssistantIds: number[];
  isFirst: boolean;
  isLast: boolean;
  isVisible: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
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
        className="
          bg-background-emphasis
          rounded-regular
          shadow-md
          p-4
          mb-4
          flex
          justify-between
          items-center
        "
      >
        <div className="w-3/4">
          <div className="flex items-center">
            <AssistantIcon assistant={assistant} />
            <h2 className="text-xl font-semibold mb-2 my-auto ml-2">
              {assistant.name}
            </h2>
          </div>
          {assistant.tools.length > 0 && (
            <ToolsDisplay tools={assistant.tools} />
          )}
          <div className="text-sm mt-2">{assistant.description}</div>
          <div className="mt-2">
            <AssistantSharedStatusDisplay assistant={assistant} user={user} />
          </div>
        </div>
        {isOwnedByUser && (
          <div className="ml-auto flex items-center">
            {!assistant.is_public && (
              <CustomTooltip
                trigger={
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setShowSharingModal(true)}
                  >
                    <Share2 size={16} />
                  </Button>
                }
                asChild
              >
                Share
              </CustomTooltip>
            )}
            <Link href={`/assistants/edit/${assistant.id}`}>
              <CustomTooltip
                trigger={
                  <Button size="icon" variant="ghost">
                    <Pen size={16} />
                  </Button>
                }
                asChild
              >
                Edit
              </CustomTooltip>
            </Link>
          </div>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost">
              <Ellipsis size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="bottom" align="start" sideOffset={5}>
            {!isFirst && (
              <DropdownMenuItem
                onClick={async () => {
                  const success = await moveAssistantUp(
                    assistant.id,
                    currentChosenAssistants || allAssistantIds
                  );
                  if (success) {
                    toast({
                      title: "Success",
                      description: `"${assistant.name}" has been moved up.`,
                      variant: "success",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: `"${assistant.name}" could not be moved up.`,
                      variant: "destructive",
                    });
                  }
                }}
              >
                <ArrowUp size={16} /> Move Up
              </DropdownMenuItem>
            )}
            {!isLast && (
              <DropdownMenuItem
                onClick={async () => {
                  const success = await moveAssistantDown(
                    assistant.id,
                    currentChosenAssistants || allAssistantIds
                  );
                  if (success) {
                    toast({
                      title: "Success",
                      description: `"${assistant.name}" has been moved down.`,
                      variant: "success",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: `"${assistant.name}" could not be moved down.`,
                      variant: "destructive",
                    });
                  }
                }}
              >
                <ArrowDown size={16} /> Move Down
              </DropdownMenuItem>
            )}
            {isVisible ? (
              <DropdownMenuItem
                onClick={async () => {
                  if (
                    currentChosenAssistants &&
                    currentChosenAssistants.length === 1
                  ) {
                    toast({
                      title: "Error",
                      description: `Cannot remove "${assistant.name}" - you must have at least one assistant.`,
                      variant: "destructive",
                    });
                    return;
                  }

                  const success = await removeAssistantFromList(
                    assistant.id,
                    currentChosenAssistants || allAssistantIds
                  );
                  if (success) {
                    toast({
                      title: "Success",
                      description: `"${assistant.name}" has been removed from your list.`,
                      variant: "success",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: `"${assistant.name}" could not be removed from your list.`,
                      variant: "destructive",
                    });
                  }
                }}
              >
                <X size={16} /> {isOwnedByUser ? "Hide" : "Remove"}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem
                onClick={async () => {
                  const success = await addAssistantToList(
                    assistant.id,
                    currentChosenAssistants || allAssistantIds
                  );
                  if (success) {
                    toast({
                      title: "Success",
                      description: `"${assistant.name}" has been added to your list.`,
                      variant: "success",
                    });
                    router.refresh();
                  } else {
                    toast({
                      title: "Error",
                      description: `"${assistant.name}" could not be added to your list.`,
                      variant: "destructive",
                    });
                  }
                }}
              >
                <Plus size={16} /> Add
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </>
  );
}

interface AssistantsListProps {
  user: User | null;
  assistants: Assistant[];
}

export function AssistantsList({ user, assistants }: AssistantsListProps) {
  const filteredAssistants = orderAssistantsForUser(assistants, user);
  const ownedButHiddenAssistants = assistants.filter(
    (assistant) =>
      checkUserOwnsAssistant(user, assistant) &&
      user?.preferences?.chosen_assistants &&
      !user?.preferences?.chosen_assistants?.includes(assistant.id)
  );
  const allAssistantIds = assistants.map((assistant) => assistant.id);

  const { data: users } = useSWR<MinimalUserSnapshot[]>(
    "/api/users",
    errorHandlingFetcher
  );

  return (
    <div className="mx-auto w-full md:w-searchbar-xs 2xl:w-searchbar-sm 3xl:w-searchbar">
      <AssistantsPageTitle>My Assistants</AssistantsPageTitle>

      <div className="flex gap-4 items-center justify-center mt-3">
        <Link href="/assistants/new" className="w-full">
          <NavigationButton>
            <div className="flex justify-center">
              <Plus className="mr-2 my-auto" size={20} />
              Create New Assistant
            </div>
          </NavigationButton>
        </Link>

        <Link href="/assistants/gallery" className="w-full">
          <NavigationButton>
            <div className="flex justify-center">
              <Search className="mr-2 my-auto" size={20} />
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

      <h3 className="text-xl mb-4">Active Assistants</h3>

      <p>
        The order the assistants appear below will be the order they appear in
        the Assistants dropdown. The first assistant listed will be your default
        assistant when you start a new chat.
      </p>

      <div className="w-full py-4 mt-3">
        {filteredAssistants.map((assistant, index) => (
          <AssistantListItem
            key={assistant.id}
            assistant={assistant}
            user={user}
            allAssistantIds={allAssistantIds}
            allUsers={users || []}
            isFirst={index === 0}
            isLast={index === filteredAssistants.length - 1}
            isVisible
          />
        ))}
      </div>

      {ownedButHiddenAssistants.length > 0 && (
        <>
          <Divider />

          <h3 className="text-xl mb-4">Your Hidden Assistants</h3>

          <p>
            Assistants you&apos;ve created that aren&apos;t currently visible in
            the Assistants selector.
          </p>

          <div className="w-full p-4">
            {ownedButHiddenAssistants.map((assistant, index) => (
              <AssistantListItem
                key={assistant.id}
                assistant={assistant}
                user={user}
                allAssistantIds={allAssistantIds}
                allUsers={users || []}
                isFirst={index === 0}
                isLast={index === filteredAssistants.length - 1}
                isVisible={false}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
