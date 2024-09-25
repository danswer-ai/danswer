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
import { User, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal } from "@/components/CustomModal";

export const PendingInvites = ({ q }: { q: string }) => {
  const [invitedPage, setInvitedPage] = useState(1);
  const [acceptedPage, setAcceptedPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
  const { data, isLoading, mutate, error } = useSWR<UsersResponse>(
    `/api/manage/users?q=${encodeURI(q)}&accepted_page=${
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

  const filteredUsers = finalInvited.filter(
    (user) =>
      user.full_name!.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex gap-10 w-full flex-col xl:gap-20 xl:flex-row">
      <div className="xl:w-1/3">
        <h2 className="text-lg md:text-2xl text-strong font-bold">
          Pending Invites
        </h2>
        <p className="text-sm pt-1 pb-4">Invitations awaiting a response.</p>
      </div>

      <div className="w-full overflow-x-auto">
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
                          <div className="flex gap-2 justify-end">
                            <Button>Resend Invite</Button>
                            <CustomModal
                              trigger={
                                <Button
                                  variant="destructive"
                                  onClick={() => setIsCancelModalVisible(true)}
                                >
                                  Cancel Invite
                                </Button>
                              }
                              title="Revoke Invite"
                              onClose={() => setIsCancelModalVisible(false)}
                              open={isCancelModalVisible}
                            >
                              <div>
                                <p>
                                  Revoking on invite will no longer allow this
                                  person to become a member of your space. You
                                  can always invite the again if you change your
                                  mind.{" "}
                                </p>

                                <div className="flex gap-2 pt-8 justify-end">
                                  <Button>Keep Member</Button>
                                  <Button variant="destructive">
                                    Revoke Invite
                                  </Button>
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
