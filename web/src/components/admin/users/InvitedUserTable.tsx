import { HidableSection } from "@/app/admin/assistants/HidableSection";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import CenteredPageSelector from "./CenteredPageSelector";
import { type PageSelectorProps } from "@/components/PageSelector";
import useSWR from "swr";
import { type User, UserStatus } from "@/lib/types";
import useSWRMutation from "swr/mutation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Props {
  users: Array<User>;
  mutate: () => void;
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
    <Button
      variant="outline"
      onClick={() => trigger({ user_email: user.email })}
    >
      Uninivite User
    </Button>
  );
};

const InvitedUserTable = ({
  users,
  currentPage,
  totalPages,
  onPageChange,
  mutate,
}: Props & PageSelectorProps) => {
  const { toast } = useToast();
  if (!users.length) return null;

  const onRemovalSuccess = () => {
    mutate();
    toast({
      title: "Success",
      description: "User uninvited!",
      variant: "success",
    });
  };
  const onRemovalError = (errorMsg: string) => {
    toast({
      title: "Error",
      description: `Unable to uninvite user - ${errorMsg}`,
      variant: "destructive",
    });
  };

  return (
    <>
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
          {users.map((user) => (
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
          onPageChange={onPageChange}
        />
      ) : null}
    </>
  );
};

export default InvitedUserTable;
