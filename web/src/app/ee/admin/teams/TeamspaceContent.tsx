"use client";

import { TeamspaceCreationForm } from "./TeamspaceCreationForm";
import { useState } from "react";
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
import { ConnectorIndexingStatus, DocumentSet, Teamspace } from "@/lib/types";
import { UsersResponse } from "@/lib/users/interfaces";
import { AdminPageTitle } from "@/components/admin/Title";

export const TeamspaceContent = ({
  assistants,
  onClick,
  data,
  refreshTeamspaces,
  ccPairs,
  users,
  documentSets,
}: {
  assistants: Assistant[];
  onClick: (teamspaceId: number) => void;
  data: Teamspace[];
  refreshTeamspaces: () => void;
  ccPairs: ConnectorIndexingStatus<any, any>[];
  users: UsersResponse;
  documentSets: DocumentSet[] | undefined;
}) => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredTeamspaces = data.filter((teamspace) =>
    teamspace.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="pb-10 md:pb-12 xl:pb-20">
        <AdminPageTitle
          icon={<Users size={32} />}
          title="Teamspaces"
          farRightElement={
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
              description="Streamline team collaboration and communication."
            >
              <TeamspaceCreationForm
                onClose={() => {
                  refreshTeamspaces();
                  setShowForm(false);
                }}
                users={users.accepted}
                ccPairs={ccPairs}
                assistants={assistants}
                documentSets={documentSets}
              />
            </CustomModal>
          }
        />

        <div className="flex gap-4">
          <Input
            placeholder="Type a command or search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1"></SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {filteredTeamspaces.length > 0 ? (
        <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(250px,1fr))] 2xl:grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
          {filteredTeamspaces
            .filter((teamspace) => !teamspace.is_up_for_deletion)
            .map((teamspace) => {
              return (
                <TeamspacesCard
                  key={teamspace.id}
                  onClick={onClick}
                  teamspace={teamspace}
                  refresh={refreshTeamspaces}
                />
              );
            })}
        </div>
      ) : (
        <div>No teamspaces match your search.</div>
      )}
    </div>
  );
};
