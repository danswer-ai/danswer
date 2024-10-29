"use client";

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
import { UserIcon } from "lucide-react";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/CustomModal";
import { useToast } from "@/hooks/use-toast";
import useSWRMutation from "swr/mutation";
import userMutationFetcher from "@/lib/admin/users/userMutationFetcher";

const RemoveUserButton = ({
  user,
  onSuccess,
  onError,
}: {
  user: User;
  onSuccess: () => void;
  onError: () => void;
}) => {
  const { trigger } = useSWRMutation(
    "/api/manage/admin/remove-invited-user",
    userMutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button
      variant="destructive"
      onClick={() => trigger({ user_email: user.email })}
    >
      Uninvite User
    </Button>
  );
};

export const PendingInvites = ({
  q,
  teamspaceId,
}: {
  q: string;
  teamspaceId?: string | string[];
}) => {
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [invitedPage, setInvitedPage] = useState(1);
  const [acceptedPage, setAcceptedPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const { data, isLoading, mutate, error } = useSWR<UsersResponse>(
    teamspaceId
      ? `/api/manage/users?q=${encodeURI(q)}&accepted_page=${
          acceptedPage - 1
        }&invited_page=${invitedPage - 1}&teamspace_id=${teamspaceId}`
      : `/api/manage/users?q=${encodeURI(q)}&accepted_page=${
          acceptedPage - 1
        }&invited_page=${invitedPage - 1}`,
    errorHandlingFetcher
  );
  const {
    data: validDomains,
    isLoading: isLoadingDomains,
    error: domainsError,
  } = useSWR<string[]>("/api/manage/admin/valid-domains", errorHandlingFetcher);

  if (isLoading || isLoadingDomains) {
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

  if (domainsError || !validDomains) {
    return (
      <ErrorCallout
        errorTitle="Error loading valid domains"
        errorMsg={domainsError?.info?.detail}
      />
    );
  }

  const { accepted, invited, accepted_pages, invited_pages } = data;

  const finalInvited = invited.filter(
    (user) => !accepted.map((u) => u.email).includes(user.email)
  );

  const filteredUsers = finalInvited.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const onRemovalSuccess = () => {
    toast({
      title: "User Removed Successfully",
      description: "The invited user has been removed from your list",
      variant: "success",
    });
    mutate();
    setIsCancelModalVisible(false);
  };

  const onRemovalError = () => {
    toast({
      title: "Failed to Remove User",
      description:
        "We encountered an issue while attempting to remove the invited user. Please try again or contact support if the problem persists",
      variant: "destructive",
    });
    setIsCancelModalVisible(false);
  };

  return (
    <div className="flex gap-10 w-full flex-col xl:gap-20 xl:flex-row">
      <div className="xl:w-2/5">
        <h2 className="text-lg md:text-2xl text-strong font-bold">
          Pending Invites
        </h2>
        <p className="text-sm mt-2">Invitations awaiting a response.</p>
      </div>

      <div className="flex-1">
        {invited.length > 0 ? (
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
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-4">
                            <div className="border rounded-full w-10 h-10 flex items-center justify-center">
                              <UserIcon />
                            </div>
                            <span className="text-sm text-subtle truncate max-w-44">
                              {user.email}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <CustomModal
                              trigger={
                                <Button
                                  variant="destructive"
                                  onClick={() => {
                                    setIsCancelModalVisible(true);
                                    setSelectedUser(user);
                                  }}
                                >
                                  Cancel Invite
                                </Button>
                              }
                              title="Revoke Invite"
                              onClose={() => {
                                setIsCancelModalVisible(false);
                                setSelectedUser(null);
                              }}
                              open={isCancelModalVisible}
                            >
                              <div>
                                <p>
                                  Revoking an invite will no longer allow this
                                  person to become a member of your space. You
                                  can always invite them again if you change
                                  your mind.
                                </p>

                                <div className="flex gap-2 pt-8 justify-end">
                                  <Button
                                    onClick={() =>
                                      setIsCancelModalVisible(false)
                                    }
                                  >
                                    Keep Member
                                  </Button>
                                  {selectedUser && (
                                    <RemoveUserButton
                                      user={selectedUser}
                                      onSuccess={onRemovalSuccess}
                                      onError={onRemovalError}
                                    />
                                  )}
                                </div>
                              </div>
                            </CustomModal>
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
          "No invited user."
        )}
      </div>
    </div>
  );
};
