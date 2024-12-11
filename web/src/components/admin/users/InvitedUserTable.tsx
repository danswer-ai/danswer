import UserInviteInfo from "@/components/admin/users/UserInviteInfo";
import { ErrorCallout } from "@/components/ErrorCallout";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { Button } from "@/components/ui/button";
import { TableHeader } from "@/components/ui/table";
import { ThreeDotsLoader } from "@/components/Loading";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";

import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import useSWRMutation from "swr/mutation";
import { type User } from "@/lib/types";

interface Props {
  pageOfUsers: User[];
  isLoading: boolean;
  error: Error | null;
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
  refresh: () => void;
  hasNoData: boolean;
  setPopup: (spec: PopupSpec) => void;
}

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
      Uninvite User
    </Button>
  );
};

const InvitedUserTable = ({
  pageOfUsers,
  isLoading,
  error,
  refresh,
  hasNoData: noInvitedUsers,
  setPopup,
}: Props) => {
  if (isLoading) {
    return <ThreeDotsLoader />;
  }

  if (error || !pageOfUsers) {
    return (
      <ErrorCallout
        errorTitle="Error loading invited users"
        errorMsg={error?.message}
      />
    );
  }

  const onRemovalSuccess = () => {
    refresh();
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

  return noInvitedUsers ? (
    <UserInviteInfo />
  ) : (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Email</TableHead>
          <TableHead>
            <div className="flex justify-end">Actions</div>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pageOfUsers.map((user) => (
          <TableRow key={user.email}>
            <TableCell>{user.email}</TableCell>
            <TableCell>
              <div className="flex justify-end">
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
  );
};

export default InvitedUserTable;
