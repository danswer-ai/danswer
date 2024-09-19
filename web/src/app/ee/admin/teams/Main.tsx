"use client";

import { Assistant } from "@/app/admin/assistants/interfaces";
import { TeamspaceContent } from "./TeamspaceContent";
import { TeamspaceSidebar } from "./TeamspaceSidebar";
import { useState } from "react";
import { useTeamspaces } from "@/lib/hooks";

const generateGradient = (teamspaceName: string) => {
  const colors = ["#f9a8d4", "#8b5cf6", "#34d399", "#60a5fa", "#f472b6"];
  const index = teamspaceName.charCodeAt(0) % colors.length;
  return `linear-gradient(135deg, ${colors[index]}, ${
    colors[(index + 1) % colors.length]
  })`;
};

export const Main = ({ assistants }: { assistants: Assistant[] }) => {
  const [selectedTeamspaceId, setSelectedTeamspaceId] = useState<number | null>(
    null
  );
  const { isLoading, error, data, refreshTeamspaces } = useTeamspaces();

  const [isExpanded, setIsExpanded] = useState(false);

  const handleShowTeamspace = (teamspaceId: number) => {
    if (teamspaceId === selectedTeamspaceId) {
      setSelectedTeamspaceId(null);
      setIsExpanded(false);
    } else {
      setSelectedTeamspaceId(teamspaceId);
      setIsExpanded(true);
    }
  };

  const selectedTeamspace = data?.find(
    (teamspace) => teamspace.id === selectedTeamspaceId
  );

  const teamspacesWithGradients = data?.map((teamspace) => ({
    ...teamspace,
    gradient: generateGradient(teamspace.name),
  }));

  const handleCloseSidebar = () => {
    setSelectedTeamspaceId(null);
    setIsExpanded(false);
  };

  return (
    <>
      <div className="h-full w-full overflow-y-auto">
        <div className="container">
          <TeamspaceContent
            assistants={assistants}
            onClick={handleShowTeamspace}
            isLoading={isLoading}
            error={error}
            data={teamspacesWithGradients}
            refreshTeamspaces={refreshTeamspaces}
          />
        </div>
      </div>

      <TeamspaceSidebar
        selectedTeamspace={selectedTeamspace}
        generateGradient={generateGradient}
        onClose={handleCloseSidebar}
        isExpanded={isExpanded}
      />
    </>
  );
};
