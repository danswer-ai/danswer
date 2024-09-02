import { PopupSpec } from "@/components/admin/connectors/Popup";
import { CreateRateLimitModal } from "../../../../admin/token-rate-limits/CreateRateLimitModal";
import { Scope } from "../../../../admin/token-rate-limits/types";
import { insertGroupTokenRateLimit } from "../../../../admin/token-rate-limits/lib";
import { mutate } from "swr";
import { useToast } from "@/hooks/use-toast";

interface AddMemberFormProps {
  userGroupId: number;
}

const handleCreateGroupTokenRateLimit = async (
  period_hours: number,
  token_budget: number,
  group_id: number = -1
) => {
  const tokenRateLimitArgs = {
    enabled: true,
    token_budget: token_budget,
    period_hours: period_hours,
  };
  return await insertGroupTokenRateLimit(tokenRateLimitArgs, group_id);
};

export const AddTokenRateLimitForm: React.FC<AddMemberFormProps> = ({
  userGroupId,
}) => {
  const { toast } = useToast();

  const handleSubmit = (
    _: Scope,
    period_hours: number,
    token_budget: number,
    group_id: number = -1
  ) => {
    handleCreateGroupTokenRateLimit(period_hours, token_budget, group_id)
      .then(() => {
        toast({
          title: "Success",
          description: "Token rate limit created!",
          variant: "success",
        });
        mutate(`/api/admin/token-rate-limits/user-group/${userGroupId}`);
      })
      .catch((error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      });
  };

  return (
    <CreateRateLimitModal
      onSubmit={handleSubmit}
      forSpecificScope={Scope.USER_GROUP}
      forSpecificUserGroup={userGroupId}
    />
  );
};
