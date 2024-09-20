"use client";

import { TeamspaceCreationForm } from "./TeamspaceCreationForm";
import { useState } from "react";
import { ThreeDotsLoader } from "@/components/Loading";
import { useConnectorCredentialIndexingStatus, useUsers } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/CustomModal";
import { Assistant } from "@/app/admin/assistants/interfaces";
import { Plus, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TeamspacesCard } from "./TeamspacesCard";
import { Teamspace } from "@/lib/types";
import { TeamspacesTable } from "./TeamspacesTable";

export const TeamspaceContent = ({
  assistants,
  onClick,
  isLoading,
  error,
  data,
  refreshTeamspaces,
}: {
  assistants: Assistant[];
  onClick: (teamspaceId: number) => void;
  data: Teamspace[] | undefined;
  isLoading: boolean;
  error: string;
  refreshTeamspaces: () => void;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus();

  const {
    data: users,
    isLoading: userIsLoading,
    error: usersError,
  } = useUsers();

  if (isLoading || isCCPairsLoading || userIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (error || !data) {
    return <div className="text-red-600">Error loading users</div>;
  }

  if (ccPairsError || !ccPairs) {
    return <div className="text-red-600">Error loading connectors</div>;
  }

  if (usersError || !users) {
    return <div className="text-red-600">Error loading users</div>;
  }

  const filteredTeamspaces = data.filter((teamspace) =>
    teamspace.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="pb-10 md:pb-12 xl:pb-20">
        <div className="flex justify-between items-center pb-10">
          <h1 className="font-bold text-xl md:text-[28px]">Team Space</h1>
          <CustomModal
            trigger={
              <Button onClick={() => setShowForm(true)}>
                <div className="flex items-center">
                  <Users size={20} />
                  <Plus size={12} className="-ml-0.5" strokeWidth={4} />
                </div>
                Create team
              </Button>
            }
            onClose={() => setShowForm(false)}
            open={showForm}
            title="Create a new Teamspace"
            description="Streamline team collaboration and communication"
          >
            <TeamspaceCreationForm
              onClose={() => {
                refreshTeamspaces();
                setShowForm(false);
              }}
              users={users.accepted}
              ccPairs={ccPairs}
              assistants={assistants}
            />
          </CustomModal>
        </div>

        <div className="flex gap-4">
          <Input
            placeholder="Type a command or search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select>
            <SelectTrigger className="w-full lg:w-64">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1"></SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-8 md:px-10 grid-cols-[repeat(auto-fit,minmax(250px,1fr))] 2xl:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {filteredTeamspaces.length > 0 ? (
          <TeamspacesCard
            onClick={onClick}
            teamspaces={filteredTeamspaces}
            refresh={refreshTeamspaces}
          />
        ) : (
          <div>No teamspaces match your search.</div>
        )}
      </div>
      {/*{data.length > 0 && (
        <div className="pt-5">
          <TeamspacesTable teamspaces={data} refresh={refreshTeamspaces} />
        </div>
      )} */}
    </div>
  );
};
