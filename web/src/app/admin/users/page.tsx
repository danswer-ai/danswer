"use client";
import { FiPlusSquare } from "react-icons/fi";
import Link from "next/link";

import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
} from "@tremor/react";
import { LoadingAnimation } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { usePopup } from "@/components/admin/connectors/Popup";
import { UsersIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { User } from "@/lib/types";
import useSWR, { mutate } from "swr";
import { ErrorCallout } from "@/components/ErrorCallout";

const UsersTable = () => {
  const { popup, setPopup } = usePopup();

  const {
    data: users,
    isLoading,
    error,
  } = useSWR<User[]>("/api/manage/users", errorHandlingFetcher);

  if (isLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  if (error || !users) {
    return (
      <ErrorCallout
        errorTitle="Error loading users"
        errorMsg={error?.info?.detail}
      />
    );
  }

  return (
    <div>
      {popup}

      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>Role</TableHeaderCell>
            <TableHeaderCell>
              <div className="flex">
                <div className="ml-auto">Actions</div>
              </div>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.id}>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <i>{user.role === "admin" ? "Admin" : "User"}</i>
              </TableCell>
              <TableCell>
                <div className="flex justify-end space-x-2">
                  {user.role !== "admin" && (
                    <Button
                      onClick={async () => {
                        const res = await fetch(
                          "/api/manage/promote-user-to-admin",
                          {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              user_email: user.email,
                            }),
                          }
                        );
                        if (!res.ok) {
                          const errorMsg = await res.text();
                          setPopup({
                            message: `Unable to promote user - ${errorMsg}`,
                            type: "error",
                          });
                        } else {
                          mutate("/api/manage/users");
                          setPopup({
                            message: "User promoted to admin user!",
                            type: "success",
                          });
                        }
                      }}
                    >
                      Promote to Admin User
                    </Button>
                  )}
                  {user.role === "admin" && (
                    <Button
                      onClick={async () => {
                        const res = await fetch(
                          "/api/manage/demote-admin-to-basic",
                          {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              user_email: user.email,
                            }),
                          }
                        );
                        if (!res.ok) {
                          const errorMsg = await res.text();
                          setPopup({
                            message: `Unable to demote admin - ${errorMsg}`,
                            type: "error",
                          });
                        } else {
                          mutate("/api/manage/users");
                          setPopup({
                            message: "Admin demoted to basic user!",
                            type: "success",
                          });
                        }
                      }}
                    >
                      Demote to Basic User
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

const AddUserButton = () => {
  return (
    <Link
      href="/admin/users/new"
      className="flex py-2 px-4 mt-2 border border-border h-fit cursor-pointer hover:bg-hover text-sm w-40"
    >
      <div className="mx-auto flex">
        <FiPlusSquare className="my-auto mr-2" />
        Add Users
      </div>
    </Link>
  );
};

const Page = () => {
  return (
    <div className="mx-auto container">
      <AdminPageTitle title="Manage Users" icon={<UsersIcon size={32} />} />
      <AddUserButton />
      <UsersTable />
    </div>
  );
};

export default Page;
