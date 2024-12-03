import { PopupSpec } from "@/components/admin/connectors/Popup";
import {
  Table,
  TableHead,
  TableRow,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { TableHeader } from "@/components/ui/table";
import CenteredPageSelector from "./CenteredPageSelector";

import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import { type User } from "@/lib/types";
import useSWRMutation from "swr/mutation";
import { LoadingAnimation } from "@/components/Loading";
import { usePaginatedData } from "@/hooks/usePaginatedData";
import { ErrorCallout } from "@/components/ErrorCallout";

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

  return (
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
        <CenteredPageSelector
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={goToPage}
        />
      ) : null}
    </>
  );
};

export default InvitedUserTable;
