import { useTeamspaces } from "@/lib/hooks";

export const useSpecificTeamspace = (teamId: string) => {
  const { data, isLoading, error, refreshTeamspaces } = useTeamspaces();
  const teamspace = data?.find((group) => group.id.toString() === teamId);
  return {
    teamspace,
    isLoading,
    error,
    refreshTeamspace: refreshTeamspaces,
  };
};
