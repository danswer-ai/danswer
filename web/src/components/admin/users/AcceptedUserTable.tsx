import { type User, UserStatus } from "@/lib/types";
import { HidableSection } from "@/app/admin/assistants/HidableSection";
import { mutate } from "swr";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import useSWRMutation from "swr/mutation";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
} from "@tremor/react";

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
      {promote ? "Promote" : "Demote"} to Admin User
    </Button>
  );
};

const BlockerButton = ({
  user,
  block,
  onSuccess,
  onError,
}: {
  user: User;
  block: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    block ? "/api/manage/admin/block-user" : "/api/manage/admin/unblock-user",
    userMutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button
      onClick={() => trigger({ user_email: user.email })}
      disabled={isMutating}
    >
      {block ? "Block" : "Unblock"} Access
    </Button>
  );
};

const AcceptedUserTable = ({
  users,
  setPopup,
}: {
  users: Array<User>;
  setPopup: (spec: PopupSpec) => void;
}) => {
  if (!users.length) return null;

  const onSuccess = (message: string) => {
    mutate("/api/manage/users");
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

  const onBlockSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "User blocked!",
      type: "success",
    });
  };
  const onBlockError = (errorMsg: string) => {
    setPopup({
      message: `Unable to block user - ${errorMsg}`,
      type: "error",
    });
  };
  const onUnblockSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "User unblocked!",
      type: "success",
    });
  };
  const onUnblockError = (errorMsg: string) => {
    setPopup({
      message: `Unable to unblock user - ${errorMsg}`,
      type: "error",
    });
  };
  return (
    <HidableSection sectionTitle="Signed Up Users">
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>
              <div className="flex">
                <div className="ml-auto">Actions</div>
              </div>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <i>{user.role === "admin" ? "Admin" : "User"}</i>
              </TableCell>
              <TableCell>
                <div className="flex justify-end space-x-2">
                  <PromoterButton
                    user={user}
                    promote={user.role !== "admin"}
                    onSuccess={onPromotionSuccess}
                    onError={onPromotionError}
                  />
                  <BlockerButton
                    user={user}
                    block={user.status === UserStatus.live}
                    onSuccess={onBlockSuccess}
                    onError={onBlockError}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </HidableSection>
  );
};

export default AcceptedUserTable;
