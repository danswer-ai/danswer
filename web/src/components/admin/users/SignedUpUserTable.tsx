import { type User, UserStatus } from "@/lib/types";
import CenteredPageSelector from "./CenteredPageSelector";
import { type PageSelectorProps } from "@/components/PageSelector";
import { HidableSection } from "@/app/admin/assistants/HidableSection";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import useSWRMutation from "swr/mutation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface Props {
  users: Array<User>;
  mutate: () => void;
}

const PromoterButton = ({
  user,
  promote,
  onSuccess,
  onError,
}: {
  user: User;
  promote: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    promote
      ? "/api/manage/promote-user-to-admin"
      : "/api/manage/demote-admin-to-basic",
    userMutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button
      onClick={() => trigger({ user_email: user.email })}
      disabled={isMutating}
    >
      {promote ? "Promote" : "Demote"} to {promote ? "Admin" : "Basic"} User
    </Button>
  );
};

const DeactivaterButton = ({
  user,
  deactivate,
  mutate,
}: {
  user: User;
  deactivate: boolean;
  mutate: () => void;
}) => {
  const { toast } = useToast();
  const { trigger, isMutating } = useSWRMutation(
    deactivate
      ? "/api/manage/admin/deactivate-user"
      : "/api/manage/admin/activate-user",
    userMutationFetcher,
    {
      onSuccess: () => {
        mutate();
        toast({
          title: "Success",
          description: `User ${deactivate ? "deactivated" : "activated"}!`,
          variant: "success",
        });
      },
      onError: (errorMsg) =>
        toast({
          title: "Error",
          description: errorMsg,
          variant: "destructive",
        }),
    }
  );
  return (
    <Button
      onClick={() => trigger({ user_email: user.email })}
      disabled={isMutating}
      variant="outline"
    >
      {deactivate ? "Deactivate" : "Activate"}
    </Button>
  );
};

const SignedUpUserTable = ({
  users,
  currentPage,
  totalPages,
  onPageChange,
  mutate,
}: Props & PageSelectorProps) => {
  const { toast } = useToast();
  if (!users.length) return null;

  const onSuccess = (message: string) => {
    mutate();
    toast({
      title: "success",
      description: message,
      variant: "success",
    });
  };
  const onError = (message: string) => {
    toast({
      title: "Error",
      description: message,
      variant: "destructive",
    });
  };
  const onPromotionSuccess = () => {
    onSuccess("User promoted to admin user!");
  };
  const onPromotionError = (errorMsg: string) => {
    onError(`Unable to promote user - ${errorMsg}`);
  };
  const onDemotionSuccess = () => {
    onSuccess("Admin demoted to basic user!");
  };
  const onDemotionError = (errorMsg: string) => {
    onError(`Unable to demote admin - ${errorMsg}`);
  };

  return (
    <HidableSection sectionTitle="Current Users" defaultOpen>
      <>
        {totalPages > 1 ? (
          <CenteredPageSelector
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        ) : null}
        <Card>
          <CardContent className="p-0">
            <Table className="overflow-auto">
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>
                    <div className="flex">
                      <div className="ml-auto">Actions</div>
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <span>{user.role === "admin" ? "Admin" : "User"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          user.status === "live" ? "success" : "secondary"
                        }
                      >
                        {user.status === "live" ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-row items-center justify-end gap-2">
                        <PromoterButton
                          user={user}
                          promote={user.role !== "admin"}
                          onSuccess={onPromotionSuccess}
                          onError={onPromotionError}
                        />
                        <DeactivaterButton
                          user={user}
                          deactivate={user.status === UserStatus.live}
                          mutate={mutate}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </>
    </HidableSection>
  );
};

export default SignedUpUserTable;
