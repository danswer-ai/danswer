"use clientt";

import { CreateRateLimitModal } from "../../../../admin/token-rate-limits/CreateRateLimitModal";
import { Scope } from "../../../../admin/token-rate-limits/types";
import { insertGroupTokenRateLimit } from "../../../../admin/token-rate-limits/lib";
import { mutate } from "swr";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "@/components/CustomModal";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface AddMemberFormProps {
  teamspaceId: number;
}

const handleCreateGroupTokenRateLimit = async (
  period_hours: number,
  token_budget: number,
  team_id: number = -1
) => {
  const tokenRateLimitArgs = {
    enabled: true,
    token_budget: token_budget,
    period_hours: period_hours,
  };
  return await insertGroupTokenRateLimit(tokenRateLimitArgs, team_id);
};

export const AddTokenRateLimitForm: React.FC<AddMemberFormProps> = ({
  teamspaceId,
}) => {
  const { toast } = useToast();
  const [modalIsOpen, setModalIsOpen] = useState(false);

  const handleSubmit = (
    _: Scope,
    period_hours: number,
    token_budget: number,
    team_id: number = -1
  ) => {
    handleCreateGroupTokenRateLimit(period_hours, token_budget, team_id)
      .then(() => {
        setModalIsOpen(false);
        toast({
          title: "Token Rate Limit Created!",
          description: "The token rate limit has been successfully created.",
          variant: "success",
        });
        mutate(`/api/admin/token-rate-limits/user-group/${teamspaceId}`);
      })
      .catch((error) => {
        toast({
          title: "Creation Failed",
          description: `Unable to create token rate limit: ${error.message}. Please try again.`,
          variant: "destructive",
        });
      });
  };

  return (
    <CustomModal
      trigger={
        <Button className="mt-3" onClick={() => setModalIsOpen(true)}>
          Create a Token Rate Limit
        </Button>
      }
      onClose={() => setModalIsOpen(false)}
      open={modalIsOpen}
      title="Create a Token Rate Limit"
    >
      <CreateRateLimitModal
        onSubmit={handleSubmit}
        forSpecificScope={Scope.TEAMSPACE}
        forSpecificTeamspace={teamspaceId}
        isOpen={modalIsOpen}
        setIsOpen={setModalIsOpen}
      />
    </CustomModal>
  );
};
