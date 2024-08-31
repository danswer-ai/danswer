import { PopupSpec } from "@/components/admin/connectors/Popup";
import { CreateRateLimitModal } from "../../../../admin/token-rate-limits/CreateRateLimitModal";
import { Scope } from "../../../../admin/token-rate-limits/types";
import { insertGroupTokenRateLimit } from "../../../../admin/token-rate-limits/lib";
import { mutate } from "swr";

interface AddMemberFormProps {
  setPopup: (popupSpec: PopupSpec | null) => void;
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
  setPopup,
  teamspaceId,
}) => {
  const handleSubmit = (
    _: Scope,
    period_hours: number,
    token_budget: number,
    team_id: number = -1
  ) => {
    handleCreateGroupTokenRateLimit(period_hours, token_budget, team_id)
      .then(() => {
        setPopup({ type: "success", message: "Token rate limit created!" });
        mutate(`/api/admin/token-rate-limits/teamspace/${teamspaceId}`);
      })
      .catch((error) => {
        setPopup({ type: "error", message: error.message });
      });
  };

  return (
    <CreateRateLimitModal
      onSubmit={handleSubmit}
      setPopup={setPopup}
      forSpecificScope={Scope.TEAMSPACE}
      forSpecificTeamspace={teamspaceId}
    />
  );
};
