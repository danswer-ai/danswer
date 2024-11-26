"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { CustomModal } from "@/components/CustomModal";
import { Button } from "@/components/ui/button";
import { Teamspace } from "@/lib/types";
import { Pencil } from "lucide-react";
import Logo from "../../../../../public/logo.png";
import { SearchInput } from "@/components/SearchInput";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { CustomTooltip } from "@/components/CustomTooltip";
import { AssistantIcon } from "@/components/assistants/AssistantIcon";

interface TeamspaceAssistantProps {
  teamspace: Teamspace & { gradient: string };
  assistants: Assistant[];
  refreshTeamspaces: () => void;
}

interface AssistantContentProps {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
  filteredAssistants: Assistant[];
  isGlobal?: boolean;
  onSelect?: (assistant: Assistant) => void;
  selectedAssistants?: Assistant[];
}

const AssistantContent = ({
  searchTerm,
  setSearchTerm,
  filteredAssistants,
  isGlobal,
  onSelect,
}: AssistantContentProps) => {
  return (
    <div className={isGlobal ? "cursor-pointer" : ""}>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg leading-none tracking-tight lg:text-xl font-semibold">
          {isGlobal ? "Available" : "Current"} Assistants
        </h2>
        <div className="w-1/2">
          <SearchInput
            placeholder="Search assistants..."
            value={searchTerm}
            onChange={setSearchTerm}
          />
        </div>
      </div>
      {filteredAssistants.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredAssistants.map((assistant) => (
            <div
              key={assistant.id}
              className="border rounded-md flex items-start gap-4 cursor-pointer"
              onClick={() => onSelect && onSelect(assistant)}
            >
              <div className="rounded-l-md h-full w-auto object-contain flex items-center justify-center p-4 border-r">
                <AssistantIcon assistant={assistant} size="xlarge" />
              </div>
              <div className="w-full p-4">
                <div className="flex items-center justify-between w-full">
                  <h3>{assistant.name}</h3>
                </div>
                <p className="text-sm pt-2 line-clamp">
                  {assistant.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p>There are no {isGlobal ? "Available" : "Current"} Assistants.</p>
      )}
    </div>
  );
};

export const TeamspaceAssistant = ({
  teamspace,
  assistants,
  refreshTeamspaces,
}: TeamspaceAssistantProps) => {
  const router = useRouter();
  const { toast } = useToast();
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);
  const [searchTermCurrent, setSearchTermCurrent] = useState("");
  const [searchTermGlobal, setSearchTermGlobal] = useState("");

  const [currentAssistants, setCurrentAssistants] = useState<Assistant[]>(
    teamspace.assistants
  );

  useEffect(() => {
    setCurrentAssistants(teamspace.assistants);
  }, [teamspace]);

  const [globalAssistants, setGlobalAssistants] = useState<Assistant[]>(() =>
    assistants.filter(
      (assistant) =>
        assistant.is_public &&
        !teamspace.assistants.some(
          (currentAssistant) => currentAssistant.id === assistant.id
        )
    )
  );

  const [tempCurrentAssistants, setTempCurrentAssistants] =
    useState<Assistant[]>(currentAssistants);
  const [tempGlobalAssistants, setTempGlobalAssistants] =
    useState<Assistant[]>(globalAssistants);

  useEffect(() => {
    setTempCurrentAssistants(currentAssistants);

    const updatedGlobalAssistants = assistants.filter(
      (assistant) =>
        assistant.is_public &&
        !currentAssistants.some(
          (currentAssistant) => currentAssistant.id === assistant.id
        )
    );

    setGlobalAssistants(updatedGlobalAssistants);
    setTempGlobalAssistants(updatedGlobalAssistants);
  }, [currentAssistants, assistants]);

  const handleSelectAssistant = (assistant: Assistant) => {
    if (tempCurrentAssistants.some((a) => a.id === assistant.id)) {
      setTempCurrentAssistants((prev) =>
        prev.filter((a) => a.id !== assistant.id)
      );
      setTempGlobalAssistants((prev) => [...prev, assistant]);
    } else {
      setTempCurrentAssistants((prev) => [...prev, assistant]);
      setTempGlobalAssistants((prev) =>
        prev.filter((a) => a.id !== assistant.id)
      );
    }
  };

  const handleSaveChanges = async () => {
    if (tempCurrentAssistants.length === 0) {
      toast({
        title: "Update Failed",
        description: "You need to select at least one assistant.",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch(
        `/api/manage/admin/teamspace/${teamspace.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_ids: teamspace.users.map((user) => user.id),
            cc_pair_ids: teamspace.cc_pairs.map((ccPair) => ccPair.id),
            document_set_ids: teamspace.document_sets.map(
              (docSet) => docSet.id
            ),
            assistant_ids: tempCurrentAssistants.map(
              (assistant) => assistant.id
            ),
          }),
        }
      );

      const responseJson = await response.json();

      if (!response.ok) {
        toast({
          title: "Update Failed",
          description: `Unable to update assistants: ${responseJson.detail || "Unknown error."}`,
          variant: "destructive",
        });
        return;
      }
      router.refresh();
      setCurrentAssistants(tempCurrentAssistants);
      setGlobalAssistants(tempGlobalAssistants);
      toast({
        title: "Assistants Updated",
        description:
          "Assistants have been successfully updated in the teamspace.",
        variant: "success",
      });
      refreshTeamspaces();
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "An error occurred while updating assistants.",
        variant: "destructive",
      });
    }

    handleCloseModal();
  };

  const handleCloseModal = () => {
    setIsAssistantModalOpen(false);
    setTempCurrentAssistants(currentAssistants);
    setTempGlobalAssistants(globalAssistants);
  };

  return (
    <CustomModal
      trigger={
        <div
          className={`rounded-md bg-background-subtle w-full p-4 min-h-36 flex flex-col justify-between ${teamspace.is_up_to_date && !teamspace.is_up_for_deletion && "cursor-pointer"}`}
          onClick={() =>
            setIsAssistantModalOpen(
              teamspace.is_up_to_date && !teamspace.is_up_for_deletion
                ? true
                : false
            )
          }
        >
          <div className="flex items-center justify-between">
            <h3>
              Assistant <span className="px-2 font-normal">|</span>{" "}
              {currentAssistants.length}
            </h3>
            {teamspace.is_up_to_date && !teamspace.is_up_for_deletion && (
              <Pencil size={16} />
            )}
          </div>

          {teamspace.assistants.length > 0 ? (
            <div className="pt-8 flex flex-wrap -space-x-3">
              {currentAssistants.slice(0, 8).map((assistant) => (
                <CustomTooltip
                  variant="white"
                  key={assistant.id}
                  trigger={
                    <div className="w-10 h-10 bg-background rounded-full flex items-center justify-center font-semibold text-inverted text-lg uppercase border overflow-hidden">
                      <AssistantIcon assistant={assistant} size="small" />
                    </div>
                  }
                >
                  {assistant.name}
                </CustomTooltip>
              ))}
              {currentAssistants.length > 8 && (
                <div className="bg-background w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold">
                  +{currentAssistants.length - 8}
                </div>
              )}
            </div>
          ) : (
            <p>There are no assistant.</p>
          )}
        </div>
      }
      title="Assistants"
      open={isAssistantModalOpen}
      onClose={handleCloseModal}
    >
      <div className="space-y-12">
        <AssistantContent
          searchTerm={searchTermCurrent}
          setSearchTerm={setSearchTermCurrent}
          filteredAssistants={tempCurrentAssistants.filter((assistant) =>
            assistant.name
              ?.toLowerCase()
              .includes(searchTermCurrent.toLowerCase())
          )}
          onSelect={handleSelectAssistant}
        />

        <AssistantContent
          searchTerm={searchTermGlobal}
          setSearchTerm={setSearchTermGlobal}
          filteredAssistants={tempGlobalAssistants.filter((assistant) =>
            assistant.name
              ?.toLowerCase()
              .includes(searchTermGlobal.toLowerCase())
          )}
          isGlobal
          onSelect={handleSelectAssistant}
        />
      </div>
      <div className="flex justify-end mt-10 gap-2">
        <Button onClick={handleCloseModal} variant="ghost">
          Cancel
        </Button>
        <Button onClick={handleSaveChanges}>Save changes</Button>
      </div>
    </CustomModal>
  );
};
