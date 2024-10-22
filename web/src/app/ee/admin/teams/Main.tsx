"use client";

import { Assistant } from "@/app/admin/assistants/interfaces";
import { TeamspaceContent } from "./TeamspaceContent";
import { TeamspaceSidebar } from "./TeamspaceSidebar";
import { useState } from "react";
import {
  useConnectorCredentialIndexingStatus,
  useTeamspaces,
  useUsers,
} from "@/lib/hooks";
import { ThreeDotsLoader } from "@/components/Loading";
import { useDocumentSets } from "@/app/admin/documents/sets/hooks";

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
  const [isExpanded, setIsExpanded] = useState(false);
  const { isLoading, error, data, refreshTeamspaces } = useTeamspaces();

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

  const {
    data: documentSets,
    isLoading: isDocumentSetsLoading,
    error: documentSetsError,
  } = useDocumentSets();

  if (isLoading || isDocumentSetsLoading || userIsLoading || isCCPairsLoading) {
    return <ThreeDotsLoader />;
  }

  if (error || !data) {
    return <div className="text-red-600">Error loading teams</div>;
  }

  if (usersError || !users || documentSetsError) {
    return <div className="text-red-600">Error loading teams</div>;
  }

  if (ccPairsError || !ccPairs) {
    return <div className="text-red-600">Error loading connectors</div>;
  }

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
            data={teamspacesWithGradients}
            refreshTeamspaces={refreshTeamspaces}
            ccPairs={ccPairs}
            users={users}
            documentSets={documentSets}
          />
        </div>
      </div>

      <TeamspaceSidebar
        assistants={assistants}
        selectedTeamspace={selectedTeamspace}
        generateGradient={generateGradient}
        onClose={handleCloseSidebar}
        isExpanded={isExpanded}
        ccPairs={ccPairs}
        documentSets={documentSets || []}
        refreshTeamspaces={refreshTeamspaces}
      />
    </>
  );
};
