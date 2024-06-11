"use client";
import { useState } from "react";
import { FiPlusSquare } from "react-icons/fi";
import Link from "next/link";
import { Modal } from "@/components/Modal";

import {
  Table,
  TableHead,
  TableRow,
  TableHeaderCell,
  TableBody,
  TableCell,
  Button,
  Text,
} from "@tremor/react";
import { LoadingAnimation } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { usePopup, PopupSpec } from "@/components/admin/connectors/Popup";
import { UsersIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { User } from "@/lib/types";
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import { ErrorCallout } from "@/components/ErrorCallout";
import { HidableSection } from "@/app/admin/assistants/HidableSection";
import BulkAdd from "@/components/admin/users/BulkAdd";

interface UsersResponse {
  accepted: Array<User>;
  invited: Array<User>;
}

const mutationFetcher = async (
  url: string,
  { arg }: { arg: { user_email: string } }
) => {
  return fetch(url, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      user_email: arg.user_email,
    }),
  }).then(async (res) => {
    if (res.ok) return res.json();
    const text = await res.text();
    throw Error(text);
  });
};

const PromoteButton = ({
  user,
  onSuccess,
  onError,
}: {
  user: User;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    "/api/manage/promote-user-to-admin",
    mutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button
      onClick={() => trigger({ user_email: user.email })}
      disabled={isMutating}
    >
      Promote to Admin User
    </Button>
  );
};

const DemoteButton = ({
  user,
  onSuccess,
  onError,
}: {
  user: User;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const { trigger } = useSWRMutation(
    "/api/manage/demote-admin-to-basic",
    mutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button onClick={() => trigger({ user_email: user.email })}>
      Demote to Basic User
    </Button>
  );
};

const AcceptedUserTable = ({
  users,
  setPopup,
}: {
  users: Array<User>;
  setPopup: (spec: PopupSpec) => void;
}) => {
  if (!users.length) return null;

  const onPromotionSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "User promoted to admin user!",
      type: "success",
    });
  };
  const onPromotionError = (errorMsg: string) => {
    setPopup({
      message: `Unable to promote user - ${errorMsg}`,
      type: "error",
    });
  };
  const onDemotionSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "Admin demoted to basic user!",
      type: "success",
    });
  };
  const onDemotionError = (errorMsg: string) => {
    setPopup({
      message: `Unable to demote admin - ${errorMsg}`,
      type: "error",
    });
  };
  return (
    <HidableSection sectionTitle="Signed Up Users">
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
                    <PromoteButton
                      user={user}
                      onSuccess={onPromotionSuccess}
                      onError={onPromotionError}
                    />
                  )}
                  {user.role === "admin" && (
                    <DemoteButton
                      user={user}
                      onSuccess={onDemotionSuccess}
                      onError={onDemotionError}
                    />
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </HidableSection>
  );
};

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
    mutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button onClick={() => trigger({ user_email: user.email })}>
      Uninivite User
    </Button>
  );
};

const InvitedUserTable = ({
  users,
  setPopup,
}: {
  users: Array<User>;
  setPopup: (spec: PopupSpec) => void;
}) => {
  if (!users.length) return null;

  const onPromotionSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "User uninvited!",
      type: "success",
    });
  };
  const onPromotionError = (errorMsg: string) => {
    setPopup({
      message: `Unable to uninvite user - ${errorMsg}`,
      type: "error",
    });
  };

  return (
    <HidableSection sectionTitle="Invited Users">
      <Table className="overflow-visible">
        <TableHead>
          <TableRow>
            <TableHeaderCell>Email</TableHeaderCell>
            <TableHeaderCell>
              <div className="flex">
                <div className="ml-auto">Actions</div>
              </div>
            </TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.email}>
              <TableCell>{user.email}</TableCell>
              <TableCell>
                <div className="flex justify-end space-x-2">
                  <RemoveUserButton
                    user={user}
                    onSuccess={onPromotionSuccess}
                    onError={onPromotionError}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </HidableSection>
  );
};

const UsersTable = () => {
  const { popup, setPopup } = usePopup();

  const { data, isLoading, error } = useSWR<UsersResponse>(
    "/api/manage/users",
    errorHandlingFetcher
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

  const { accepted: users, invited } = data;

  return (
    <div>
      {popup}

      <div className="flex flex-col gap-y-4">
        <AddUserButton setPopup={setPopup} />
        <InvitedUserTable users={invited} setPopup={setPopup} />
        <AcceptedUserTable users={users} setPopup={setPopup} />
      </div>
    </div>
  );
};

const AddUserButton = ({
  setPopup,
}: {
  setPopup: (spec: PopupSpec) => void;
}) => {
  const [modal, setModal] = useState(false);
  const onSuccess = () => {
    mutate("/api/manage/users");
    setModal(false);
    setPopup({
      message: "Users invited!",
      type: "success",
    });
  };
  return (
    <>
      <Button onClick={() => setModal(true)}>
        <div className="flex">
          <FiPlusSquare className="my-auto mr-2" />
          Invite Users
        </div>
      </Button>
      {modal && (
        <Modal title="Bulk Add Users" onOutsideClick={() => setModal(false)}>
          <div className="flex flex-col gap-y-4">
            <Text className="font-medium text-base">
              Add the email addresses to import, separated by whitespaces.
            </Text>
            <BulkAdd onSuccess={onSuccess} />
          </div>
        </Modal>
      )}
    </>
  );
};

const Page = () => {
  return (
    <div className="mx-auto container">
      <AdminPageTitle title="Manage Users" icon={<UsersIcon size={32} />} />
      <UsersTable />
    </div>
  );
};

export default Page;
