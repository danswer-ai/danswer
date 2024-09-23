"use client";

import { useState } from "react";
import { AddUserButton } from "./page";
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
import { User } from "lucide-react";

export const PendingInvites = ({ q }: { q: string }) => {
  const [invitedPage, setInvitedPage] = useState(1);
  const [acceptedPage, setAcceptedPage] = useState(1);
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

  return (
    <div className="flex gap-20 w-full">
      <div className="w-1/3">
        <h2 className="text-lg md:text-2xl text-strong font-bold">
          Pending Invites
        </h2>
        <p className="text-sm pt-1 pb-4">Invitations awaiting a response.</p>
      </div>

      <div className="w-full flex-1">
        {invited.length > 0 ? (
          <>
            <Input />
            <Card className="mt-4">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Space</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Delete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {finalInvited.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex gap-2">
                            <div className="border rounded-full w-10 h-10 flex items-center justify-center">
                              <User />
                            </div>
                            <div>
                              <span>{user.full_name}</span>
                              <span>{user.email}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span>
                            {user.role === "admin" ? "Admin" : "User"}
                          </span>
                        </TableCell>
                        <TableCell>Active</TableCell>
                        <TableCell>dd</TableCell>
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
