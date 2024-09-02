"use client";

import { GroupsIcon } from "@/components/icons/icons";
import { UserGroupsTable } from "./UserGroupsTable";
import { UserGroupCreationForm } from "./UserGroupCreationForm";
import { useState } from "react";
import { ThreeDotsLoader } from "@/components/Loading";
import {
  useConnectorCredentialIndexingStatus,
  useUserGroups,
  useUsers,
} from "@/lib/hooks";
import { AdminPageTitle } from "@/components/admin/Title";
import { Divider } from "@tremor/react";
import { Button } from "@/components/ui/button";

const Main = () => {
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
      <Button onClick={() => setShowForm(true)}>Create New User Group</Button>
      {data.length > 0 && (
        <div className="pt-5">
          <UserGroupsTable userGroups={data} refresh={refreshUserGroups} />
        </div>
      )}
      {showForm && (
        <UserGroupCreationForm
          onClose={() => {
            refreshUserGroups();
            setShowForm(false);
          }}
          users={users.accepted}
          ccPairs={ccPairs}
        />
      )}
    </>
  );
};

const Page = () => {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Manage Users Groups"
        icon={<GroupsIcon size={32} />}
      />

      <Main />
    </div>
  );
};

export default Page;
