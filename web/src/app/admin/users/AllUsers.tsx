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

const ValidDomainsDisplay = ({ validDomains }: { validDomains: string[] }) => {
  if (!validDomains.length) {
    return (
      <div className="text-sm pt-2 pb-4 space-y-2">
        No invited users. Anyone can sign up with a valid email address. To
        restrict access you can:
        <div className="flex flex-wrap mt-1">
          (1) Invite users above. Once a user has been invited, only emails that
          have explicitly been invited will be able to sign-up.
        </div>
        <div className="mt-1">
          (2) Set the{" "}
          <b className="font-mono w-fit h-fit">VALID_EMAIL_DOMAINS</b>{" "}
          environment variable to a comma separated list of email domains. This
          will restrict access to users with email addresses from these domains.
        </div>
      </div>
    );
  }

  return (
    <div className="text-sm pt-2 pb-4 space-y-2">
      <p>
        Anyone with an email address with any of the following domains can sign
        up: <i>{validDomains.join(", ")}</i>.
      </p>
      <p>
        To further restrict access you can invite users. Once a user has been
        invited, only emails that have explicitly been invited will be able to
        sign-up.
      </p>
    </div>
  );
};

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
          title: "User Status Updated",
          description: `User has been successfully ${deactivate ? "deactivated" : "activated"}.`,
          variant: "success",
        });
      },
      onError: (errorMsg) =>
        toast({
          title: "Operation Failed",
          description: `Unable to ${deactivate ? "deactivate" : "activate"} user: ${errorMsg}`,
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
          title: "User Promotion Successful",
          description: "The user has been successfully promoted to admin.",
          variant: "success",
        });
      },
      onError: (errorMsg) => {
        toast({
          title: "Promotion Failed",
          description: `Failed to promote the user: ${errorMsg}`,
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
          title: "Demotion Successful",
          description:
            "The user has been successfully demoted to a basic user.",
          variant: "success",
        });
      },
      onError: (errorMsg) => {
        toast({
          title: "Demotion Failed",
          description: `Unable to demote the user: ${errorMsg}`,
          variant: "destructive",
        });
      },
    }
  );

  const {
    data: validDomains,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = useSWR<string[]>("/api/manage/admin/valid-domains", errorHandlingFetcher);

  if (isLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  if (domainsError || !validDomains) {
    return (
      <ErrorCallout
        errorTitle="Error loading valid domains"
        errorMsg={domainsError?.info?.detail}
      />
    );
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
      <div className="xl:w-2/5">
        <h2 className="text-lg md:text-2xl text-strong font-bold">Users</h2>
        <ValidDomainsDisplay validDomains={validDomains} />
        <AddUserButton />
      </div>

      <div className="flex-1">
        {filteredUsers.length > 0 ? (
          <>
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
                      <TableHead>Role</TableHead>
                      <TableHead></TableHead>
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
                              <span className="truncate max-w-44 font-medium">
                                {user.full_name}
                              </span>
                              <span className="text-sm text-subtle truncate max-w-44">
                                {user.email}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            onValueChange={(value) =>
                              handleRoleChange(user.email, value)
                            }
                            value={user.role}
                          >
                            <SelectTrigger className="w-32">
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
                          <div className="flex justify-end">
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
        ) : (
          "No users."
        )}
      </div>
    </div>
  );
};
