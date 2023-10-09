"use client";

import { GroupsIcon } from "@/components/icons/icons";
import { GroupDisplay } from "./GroupDisplay";
import { FiAlertCircle, FiChevronLeft } from "react-icons/fi";
import { useSpecificUserGroup } from "./hook";
import { ThreeDotsLoader } from "@/components/Loading";
import { useConnectorCredentialIndexingStatus, useUsers } from "@/lib/hooks";
import { useRouter } from "next/navigation";

const Page = ({ params }: { params: { groupId: string } }) => {
  const router = useRouter();

  const {
    userGroup,
    isLoading: userGroupIsLoading,
    error: userGroupError,
    refreshUserGroup,
  } = useSpecificUserGroup(params.groupId);
  const {
    data: users,
    isLoading: userIsLoading,
    error: usersError,
  } = useUsers();
  const {
    data: ccPairs,
    isLoading: isCCPairsLoading,
    error: ccPairsError,
  } = useConnectorCredentialIndexingStatus();

  if (userGroupIsLoading || userIsLoading || isCCPairsLoading) {
    return (
      <div className="h-full">
        <div className="my-auto">
          <ThreeDotsLoader />
        </div>
      </div>
    );
  }

  if (!userGroup || userGroupError) {
    return <div>Error loading user group</div>;
  }
  if (!users || usersError) {
    return <div>Error loading users</div>;
  }
  if (!ccPairs || ccPairsError) {
    return <div>Error loading connectors</div>;
  }

  return (
    <div className="mx-auto container">
      <div
        className="my-auto flex mb-1 hover:bg-gray-700 w-fit pr-2 cursor-pointer rounded-lg"
        onClick={() => router.back()}
      >
        <FiChevronLeft className="mr-1 my-auto" />
        Back
      </div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <GroupsIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">
          {userGroup ? userGroup.name : <FiAlertCircle />}
        </h1>
      </div>

      {userGroup ? (
        <GroupDisplay
          users={users}
          ccPairs={ccPairs}
          userGroup={userGroup}
          refreshUserGroup={refreshUserGroup}
        />
      ) : (
        <div>Unable to fetch User Group :(</div>
      )}
    </div>
  );
};

export default Page;
