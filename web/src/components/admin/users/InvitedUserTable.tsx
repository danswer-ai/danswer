import { PopupSpec } from "@/components/admin/connectors/Popup";
import { HidableSection } from "@/app/admin/assistants/HidableSection";
import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
} from "@tremor/react";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import useSWR, { mutate } from "swr";
import { type User, UserStatus } from "@/lib/types";
import useSWRMutation from "swr/mutation";

const RemoveUserButton = ({
  user,
  onSuccess,
  onError,
}: {
  user: User;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const { trigger } = useSWRMutation(
    "/api/manage/admin/remove-invited-user",
    userMutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button onClick={() => trigger({ user_email: user.email })}>
      Uninivite User
    </Button>
  );
};

const InvitedUserTable = ({
  users,
  setPopup,
}: {
  users: Array<User>;
  setPopup: (spec: PopupSpec) => void;
}) => {
  if (!users.length) return null;

  const onRemovalSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "User uninvited!",
      type: "success",
    });
  };
  const onRemovalError = (errorMsg: string) => {
    setPopup({
      message: `Unable to uninvite user - ${errorMsg}`,
      type: "error",
    });
  };

  return (
    <HidableSection sectionTitle="Invited Users">
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>
              <div className="flex">
                <div className="ml-auto">Actions</div>
              </div>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.email}>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <div className="flex justify-end space-x-2">
                  <RemoveUserButton
                    user={user}
                    onSuccess={onRemovalSuccess}
                    onError={onRemovalError}
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

export default InvitedUserTable;
