import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import useSWR from "swr";
import { UsersResponse } from "@/lib/users/interfaces";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { User as UserIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";
import useSWRMutation from "swr/mutation";
import { useToast } from "@/hooks/use-toast";
import { AddUserButton } from "./AddUserButton";
import { User, UserStatus } from "@/lib/types";
import { Button } from "@/components/ui/button";

export const DeactivaterButton = ({
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
      variant={deactivate ? "destructive" : "default"}
    >
      {deactivate ? "Deactivate" : "Activate"}
    </Button>
  );
};

export const AllUsers = ({ q }: { q: string }) => {
  const [invitedPage, setInvitedPage] = useState(1);
  const [acceptedPage, setAcceptedPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const { data, isLoading, mutate, error } = useSWR<UsersResponse>(
    `/api/manage/users?q=${encodeURI(q)}&accepted_page=${acceptedPage - 1}&invited_page=${invitedPage - 1}`,
    errorHandlingFetcher
  );

  const { toast } = useToast();

  const { trigger: promoteTrigger } = useSWRMutation(
    "/api/manage/promote-user-to-admin",
    userMutationFetcher,
    {
      onSuccess: () => {
        mutate();
        toast({
          title: "Success",
          description: "User promoted to admin!",
          variant: "success",
        });
      },
      onError: (errorMsg) => {
        toast({
          title: "Error",
          description: `Unable to promote user - ${errorMsg}`,
          variant: "destructive",
        });
      },
    }
  );

  const { trigger: demoteTrigger } = useSWRMutation(
    "/api/manage/demote-admin-to-basic",
    userMutationFetcher,
    {
      onSuccess: () => {
        mutate();
        toast({
          title: "Success",
          description: "User demoted to basic user!",
          variant: "success",
        });
      },
      onError: (errorMsg) => {
        toast({
          title: "Error",
          description: `Unable to demote user - ${errorMsg}`,
          variant: "destructive",
        });
      },
    }
  );

  if (isLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  if (error || !data) {
    return (
      <ErrorCallout
        errorTitle="Error loading users"
        errorMsg={error?.info?.detail}
      />
    );
  }

  const { accepted } = data;

  const handleRoleChange = async (userEmail: string, newRole: string) => {
    if (newRole === "admin") {
      await promoteTrigger({ user_email: userEmail });
    } else {
      await demoteTrigger({ user_email: userEmail });
    }
  };

  const filteredUsers = accepted.filter(
    (user) =>
      user.full_name!.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex gap-10 w-full flex-col xl:gap-20 xl:flex-row">
      <div className="xl:w-1/3">
        <h2 className="text-lg md:text-2xl text-strong font-bold">Users</h2>
        <div className="text-sm pt-2 pb-4 space-y-2">
          <p>
            Anyone with an email address with any of the following domains can
            sign up: vividsolution.io,enmedd.com,arnold.io.
          </p>
          <p>
            To further restrict access you can invite users. Once a user has
            been invited, only emails that have explicitly been invited will be
            able to sign-up.
          </p>
        </div>
        <AddUserButton />
      </div>

      <div className="w-full overflow-auto">
        <Input
          placeholder="Search user..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Card className="mt-4">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Space</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Deactivate</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex gap-4">
                        <div className="border rounded-full w-10 h-10 flex items-center justify-center">
                          <UserIcon />
                        </div>
                        <div className="flex flex-col">
                          <span className="truncate max-w-44">
                            {user.full_name}
                          </span>
                          <span className="text-sm text-subtle truncate max-w-44">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Select>
                        <SelectTrigger className="w-36">
                          <SelectValue placeholder="Space" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="teamspace">Teamspace</SelectItem>
                          <SelectItem value="workspace">Workspace</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Select
                        onValueChange={(value) =>
                          handleRoleChange(user.email, value)
                        }
                        value={user.role}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue>
                            {user.role === "admin" ? "Admin" : "User"}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <DeactivaterButton
                        user={user}
                        deactivate={user.status === UserStatus.live}
                        mutate={mutate}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
