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

interface Props {
  users: Array<User>;
  setPopup: (spec: PopupSpec) => void;
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
  setPopup,
  mutate,
}: {
  user: User;
  deactivate: boolean;
  setPopup: (spec: PopupSpec) => void;
  mutate: () => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    deactivate
      ? "/api/manage/admin/deactivate-user"
      : "/api/manage/admin/activate-user",
    userMutationFetcher,
    {
      onSuccess: () => {
        mutate();
        setPopup({
          message: `User ${deactivate ? "deactivated" : "activated"}!`,
          type: "success",
        });
      },
      onError: (errorMsg) => setPopup({ message: errorMsg, type: "error" }),
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
  setPopup,
  currentPage,
  totalPages,
  onPageChange,
  mutate,
}: Props & PageSelectorProps) => {
  if (!users.length) return null;

  const onSuccess = (message: string) => {
    mutate();
    setPopup({
      message,
      type: "success",
    });
  };
  const onError = (message: string) => {
    setPopup({
      message,
      type: "error",
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
                  <i>{user.role === "admin" ? "Admin" : "User"}</i>
                </TableCell>
                <TableCell>
                  <i>{user.status === "live" ? "Active" : "Inactive"}</i>
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
                      setPopup={setPopup}
                      mutate={mutate}
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    </HidableSection>
  );
};

export default SignedUpUserTable;
