"use client";

import { GroupsIcon } from "@/components/icons/icons";
import { UserGroupsTable } from "./UserGroupsTable";
import { UserGroupCreationForm } from "./UserGroupCreationForm";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { Button } from "@/components/Button";
import { ThreeDotsLoader } from "@/components/Loading";
import { useConnectorCredentialIndexingStatus, useUsers } from "@/lib/hooks";
import { useUserGroups } from "./hooks";

const Main = () => {
  const { popup, setPopup } = usePopup();
  const [showForm, setShowForm] = useState(false);

  const { data, isLoading, error, refreshUserGroups } = useUserGroups();

  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus();

  const {
    data: users,
    isLoading: userIsLoading,
    error: usersError,
  } = useUsers();

  if (isLoading || isCCPairsLoading || userIsLoading) {
    return <ThreeDotsLoader />;
  }

  if (error || !data) {
    return <div className="text-red-600">Error loading users</div>;
  }

  if (ccPairsError || !ccPairs) {
    return <div className="text-red-600">Error loading connectors</div>;
  }

  if (usersError || !users) {
    return <div className="text-red-600">Error loading users</div>;
  }

  return (
    <>
      {popup}
      <div className="my-3">
        <Button onClick={() => setShowForm(true)}>Create New User Group</Button>
      </div>
      <UserGroupsTable
        userGroups={data}
        setPopup={setPopup}
        refresh={refreshUserGroups}
      />
      {showForm && (
        <UserGroupCreationForm
          onClose={() => {
            refreshUserGroups();
            setShowForm(false);
          }}
          setPopup={setPopup}
          users={users}
          ccPairs={ccPairs}
        />
      )}
    </>
  );
};

const Page = () => {
  return (
    <div className="mx-auto container">
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <GroupsIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Manage Users Groups</h1>
      </div>

      <Main />
    </div>
  );
};

export default Page;
