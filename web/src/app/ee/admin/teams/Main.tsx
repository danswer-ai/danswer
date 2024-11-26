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
import { useParams } from "next/navigation";
import { useGradient } from "@/hooks/useGradient";

export const Main = ({ assistants }: { assistants: Assistant[] }) => {
  const { teamspaceId } = useParams();
  const [selectedTeamspaceId, setSelectedTeamspaceId] = useState<number | null>(
    null
  );
  const [isExpanded, setIsExpanded] = useState(false);
  const { isLoading, error, data, refreshTeamspaces } = useTeamspaces();

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus(undefined, false, teamspaceId);

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

  const selectedTeamspace = data.find(
    (teamspace) => teamspace.id === selectedTeamspaceId
  );

  const teamspacesWithGradients = data.map((teamspace) => ({
    ...teamspace,
    gradient: useGradient(teamspace.name),
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
        onClose={handleCloseSidebar}
        isExpanded={isExpanded}
        ccPairs={ccPairs}
        documentSets={documentSets || []}
        refreshTeamspaces={refreshTeamspaces}
      />
    </>
  );
};
