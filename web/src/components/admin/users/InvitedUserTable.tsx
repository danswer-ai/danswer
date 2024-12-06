import UserInviteInfo from "@/components/admin/users/UserInviteInfo";
import { PageSelector } from "@/components/PageSelector";
import { ErrorCallout } from "@/components/ErrorCallout";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { Button } from "@/components/ui/button";
import { TableHeader } from "@/components/ui/table";
import { LoadingAnimation } from "@/components/Loading";
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
import { usePaginatedData } from "@/hooks/usePaginatedData";

interface Props {
  setPopup: (spec: PopupSpec) => void;
  q?: string;
}

const ITEMS_PER_PAGE = 10;
const PAGES_PER_BATCH = 2;

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

const InvitedUserTable = ({ setPopup, q = "" }: Props) => {
  const {
    currentPageData: pageOfUsers,
    isLoading,
    error,
    currentPage,
    totalPages,
    goToPage,
    refresh,
    hasNoData: noInvitedUsers,
  } = usePaginatedData<User>({
    itemsPerPage: ITEMS_PER_PAGE,
    pagesPerBatch: PAGES_PER_BATCH,
    endpoint: "/api/manage/users/invited",
    query: q,
  });

  if (isLoading) {
    return <LoadingAnimation text="Loading" />;
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
    <>
      <Table className="overflow-visible">
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
      {totalPages > 1 ? (
        <PageSelector
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      ) : null}
    </>
  );
};

export default InvitedUserTable;
