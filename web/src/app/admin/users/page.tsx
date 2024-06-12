"use client";
import InvitedUserTable from "@/components/admin/users/InvitedUserTable";
import SignedUpUserTable from "@/components/admin/users/SignedUpUserTable";
import { SearchBar } from "@/components/search/SearchBar";
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
import { type User, UserStatus } from "@/lib/types";
import useSWR, { mutate } from "swr";
import useSWRMutation from "swr/mutation";
import { ErrorCallout } from "@/components/ErrorCallout";
import { HidableSection } from "@/app/admin/assistants/HidableSection";
import BulkAdd from "@/components/admin/users/BulkAdd";

interface UsersResponse {
  accepted: Array<User>;
  invited: Array<User>;
}

const UsersTables = ({
  q,
  setPopup,
}: {
  q: string;
  setPopup: (spec: PopupSpec) => void;
}) => {
  const { data, isLoading, error } = useSWR<UsersResponse>(
    `/api/manage/users?q=${encodeURI(q)}`,
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

  const { accepted, invited } = data;

  return (
    <>
      <InvitedUserTable users={invited} setPopup={setPopup} />
      <SignedUpUserTable users={accepted} setPopup={setPopup} />
    </>
  );
};

const SearchableTables = () => {
  const { popup, setPopup } = usePopup();
  const [query, setQuery] = useState("");
  const [q, setQ] = useState("");

  return (
    <div>
      {popup}

      <div className="flex flex-col gap-y-4">
        <div className="flex gap-x-4">
          <AddUserButton setPopup={setPopup} />
          <div className="flex-grow">
            <SearchBar
              query={query}
              setQuery={setQuery}
              onSearch={() => setQ(query)}
            />
          </div>
        </div>
        <UsersTables q={q} setPopup={setPopup} />
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
      <SearchableTables />
    </div>
  );
};

export default Page;
