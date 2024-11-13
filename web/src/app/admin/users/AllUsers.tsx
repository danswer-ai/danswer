import { useEffect, useState } from "react";
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
import { errorHandlingFetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Trash } from "lucide-react";
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
import { UserProfile } from "@/components/UserProfile";
import { useUser } from "@/components/user/UserProvider";
import { useUsers } from "@/lib/hooks";
import { CustomTooltip } from "@/components/CustomTooltip";
import { CustomModal } from "@/components/CustomModal";
import { Badge } from "@/components/ui/badge";
import { DeleteModal } from "@/components/DeleteModal";

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
  role,
}: {
  user: User;
  deactivate: boolean;
  mutate: () => void;
  role: string;
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

export const AllUsers = ({
  q,
  teamspaceId,
}: {
  q: string;
  teamspaceId?: string | string[];
}) => {
  const { toast } = useToast();
  const [invitedPage, setInvitedPage] = useState(1);
  const [acceptedPage, setAcceptedPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);
  const [teamspaceData, setTeamspaceData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const { data, isLoading, error, refreshUsers } = useUsers(
    q,
    acceptedPage,
    invitedPage,
    teamspaceId
  );

  useEffect(() => {
    if (teamspaceId && !teamspaceData) {
      const fetchTeamspaceData = async () => {
        setLoading(true);
        try {
          const response = await fetch(
            `/api/manage/admin/teamspace/${teamspaceId}`
          );
          if (!response.ok) {
            throw new Error("Failed to fetch teamspace");
          }
          const data = await response.json();
          setTeamspaceData(data);
        } catch (err) {
          console.log("Error fetching teamspace", err);
        } finally {
          setLoading(false);
        }
      };

      fetchTeamspaceData();
    }
  }, [teamspaceId, teamspaceData]);

  const { trigger: promoteTrigger } = useSWRMutation(
    teamspaceId
      ? `/api/manage/admin/teamspace/user-role/${teamspaceId}`
      : "/api/manage/promote-workspace-user-to-admin",
    userMutationFetcher,
    {
      onSuccess: () => {
        refreshUsers();
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
    teamspaceId
      ? `/api/manage/admin/teamspace/user-role/${teamspaceId}`
      : "/api/manage/demote-workspace-admin-to-basic",
    userMutationFetcher,
    {
      onSuccess: () => {
        refreshUsers();
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

  const deleteUser = async () => {
    console.log("FFF");
    if (!teamspaceId || !userToDelete) return;

    try {
      const response = await fetch(
        `/api/manage/admin/teamspace/user-remove/${teamspaceId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify([userToDelete]),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || "Failed to delete user");
      }

      refreshUsers();
      setIsDeleteModalOpen(false);
      toast({
        title: "User Removed",
        description:
          "The user has been successfully removed from the teamspace.",
        variant: "success",
      });
    } catch (error) {
      if (error instanceof Error) {
        toast({
          title: "Error",
          description: `Failed to remove the user: ${error.message}`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unknown error occurred while removing the user.",
          variant: "destructive",
        });
      }
    }
  };

  const {
    data: validDomains,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = !teamspaceId
    ? useSWR<string[]>("/api/manage/admin/valid-domains", errorHandlingFetcher)
    : { data: [], isLoading: false, error: null };

  if (isLoading || isLoadingDomains || loading) {
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
      await promoteTrigger({ user_email: userEmail, new_role: "admin" });
    } else {
      await demoteTrigger({ user_email: userEmail, new_role: "basic" });
    }
  };

  const filteredUsers = accepted
    .filter(
      (user) =>
        user.full_name!.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      if (a.email === teamspaceData?.creator?.email) return -1;
      if (b.email === teamspaceData?.creator?.email) return 1;
      return a.id === user?.id ? -1 : 1;
    });

  return (
    <>
      {isDeleteModalOpen && (
        <DeleteModal
          title="Are you sure you want to remove this user?"
          onClose={() => setIsDeleteModalOpen(false)}
          open={isDeleteModalOpen}
          description="You are about to remove this user on the teamspace."
          onSuccess={deleteUser}
        />
      )}

      <div className="flex gap-10 w-full flex-col xl:gap-20 xl:flex-row">
        <div className="xl:w-2/5">
          <h2 className="text-lg md:text-2xl text-strong font-bold">Users</h2>
          <ValidDomainsDisplay validDomains={validDomains} />
          <AddUserButton
            teamspaceId={teamspaceId}
            refreshUsers={refreshUsers}
          />
        </div>
        <div className="flex-1 space-y-4">
          <Input
            placeholder="Search user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {filteredUsers.length > 0 ? (
            <Card className="mt-4">
              <CardContent className="p-0">
                <Table className="">
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((filteredUser) => (
                      <TableRow key={filteredUser.id}>
                        <TableCell>
                          <div className="flex gap-4 items-center">
                            <UserProfile user={filteredUser} />
                            <div className="flex flex-col">
                              <span className="truncate max-w-44 font-medium">
                                {filteredUser.full_name}
                              </span>
                              <span className="text-sm text-subtle truncate max-w-44">
                                {filteredUser.email}
                              </span>
                            </div>
                            {filteredUser?.email ===
                              teamspaceData?.creator?.email && (
                              <Badge>Creator</Badge>
                            )}
                            {user?.email === filteredUser.email && (
                              <Badge>You</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            onValueChange={(value) =>
                              handleRoleChange(filteredUser.email, value)
                            }
                            value={filteredUser.role}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue>
                                {filteredUser.role === "admin"
                                  ? "Admin"
                                  : "User"}
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">User</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        {filteredUser?.email !==
                          teamspaceData?.creator?.email &&
                          user?.email !== filteredUser.email && (
                            <TableCell>
                              {teamspaceId ? (
                                <CustomTooltip
                                  trigger={
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => {
                                        setIsDeleteModalOpen(true);
                                        setUserToDelete(filteredUser.email);
                                      }}
                                    >
                                      <Trash size={16} />
                                    </Button>
                                  }
                                  variant="destructive"
                                >
                                  Remove
                                </CustomTooltip>
                              ) : (
                                <div className="flex justify-end">
                                  <DeactivaterButton
                                    user={filteredUser}
                                    deactivate={
                                      filteredUser.status === UserStatus.live
                                    }
                                    mutate={refreshUsers}
                                    role={filteredUser.role}
                                  />
                                </div>
                              )}
                            </TableCell>
                          )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          ) : (
            <p>No users.</p>
          )}
        </div>
      </div>
    </>
  );
};
