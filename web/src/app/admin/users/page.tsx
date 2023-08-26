"use client";

import { Button } from "@/components/Button";
import { LoadingAnimation } from "@/components/Loading";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { UsersIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import { User } from "@/lib/types";
import useSWR, { mutate } from "swr";

const columns = [
  {
    header: "Email",
    key: "email",
  },
  {
    header: "Role",
    key: "role",
  },
  {
    header: "Promote",
    key: "promote",
  },
];

const UsersTable = () => {
  const { popup, setPopup } = usePopup();

  const { data, isLoading, error } = useSWR<User[]>(
    "/api/manage/users",
    fetcher
  );

  if (isLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  if (error || !data) {
    return <div className="text-red-600">Error loading users</div>;
  }

  return (
    <div>
      {popup}
      <BasicTable
        columns={columns}
        data={data.map((user) => {
          return {
            email: user.email,
            role: <i>{user.role === "admin" ? "Admin" : "User"}</i>,
            promote:
              user.role !== "admin" ? (
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
                        message: "User promoted to admin!",
                        type: "success",
                      });
                    }
                  }}
                >
                  Promote to Admin!
                </Button>
              ) : (
                ""
              ),
          };
        })}
      />
    </div>
  );
};

const Page = () => {
  return (
    <div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <UsersIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Manage Users</h1>
      </div>

      <UsersTable />
    </div>
  );
};

export default Page;
