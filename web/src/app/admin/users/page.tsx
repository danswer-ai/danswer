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
import { User, UserStatus } from "@/lib/types";
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

const PromoterButton = ({
  user,
  promote,
  onSuccess,
  onError,
}: {
  user: User;
  promote: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    promote
      ? "/api/manage/promote-user-to-admin"
      : "/api/manage/demote-admin-to-basic",
    mutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button
      onClick={() => trigger({ user_email: user.email })}
      disabled={isMutating}
    >
      {promote ? "Promote" : "Demote"} to Admin User
    </Button>
  );
};

const BlockerButton = ({
  user,
  block,
  onSuccess,
  onError,
}: {
  user: User;
  block: boolean;
  onSuccess: () => void;
  onError: (message: string) => void;
}) => {
  const { trigger, isMutating } = useSWRMutation(
    block ? "/api/manage/admin/block-user" : "/api/manage/admin/unblock-user",
    mutationFetcher,
    { onSuccess, onError }
  );
  return (
    <Button
      onClick={() => trigger({ user_email: user.email })}
      disabled={isMutating}
    >
      {block ? "Block" : "Unblock"} Access
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

  const onSuccess = (message: string) => {
    mutate("/api/manage/users");
    setPopup({
      message,
      type: "success",
    });
  };
  const onError = (message: string) => {
    setPopup({
      message,
      type: "error",
    });
  };
  const onPromotionSuccess = () => {
    onSuccess("User promoted to admin user!");
  };
  const onPromotionError = (errorMsg: string) => {
    onError(`Unable to promote user - ${errorMsg}`);
  };
  const onDemotionSuccess = () => {
    onSuccess("Admin demoted to basic user!");
  };
  const onDemotionError = (errorMsg: string) => {
    onError(`Unable to demote admin - ${errorMsg}`);
  };

  const onBlockSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "User blocked!",
      type: "success",
    });
  };
  const onBlockError = (errorMsg: string) => {
    setPopup({
      message: `Unable to block user - ${errorMsg}`,
      type: "error",
    });
  };
  const onUnblockSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "User unblocked!",
      type: "success",
    });
  };
  const onUnblockError = (errorMsg: string) => {
    setPopup({
      message: `Unable to unblock user - ${errorMsg}`,
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
                  <PromoterButton
                    user={user}
                    promote={user.role !== "admin"}
                    onSuccess={onPromotionSuccess}
                    onError={onPromotionError}
                  />
                  <BlockerButton
                    user={user}
                    block={user.status === UserStatus.live}
                    onSuccess={onBlockSuccess}
                    onError={onBlockError}
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

  const onRemovalSuccess = () => {
    mutate("/api/manage/users");
    setPopup({
      message: "User uninvited!",
      type: "success",
    });
  };
  const onRemovalError = (errorMsg: string) => {
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
                    onSuccess={onRemovalSuccess}
                    onError={onRemovalError}
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
      <Button className="w-fit" onClick={() => setModal(true)}>
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
