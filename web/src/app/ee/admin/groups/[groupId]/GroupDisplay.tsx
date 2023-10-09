"use client";

import { usePopup } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { UserGroup } from "../types";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { Button } from "@/components/Button";
import { AddMemberForm } from "./AddMemberForm";
import { TrashIcon } from "@/components/icons/icons";
import { updateUserGroup } from "./lib";
import { LoadingAnimation } from "@/components/Loading";
import { ConnectorIndexingStatus, User } from "@/lib/types";
import { AddConnectorForm } from "./AddConnectorForm";

interface GroupDisplayProps {
  users: User[];
  ccPairs: ConnectorIndexingStatus<any, any>[];
  userGroup: UserGroup;
  refreshUserGroup: () => void;
}

export const GroupDisplay = ({
  users,
  ccPairs,
  userGroup,
  refreshUserGroup,
}: GroupDisplayProps) => {
  const { popup, setPopup } = usePopup();
  const [addMemberFormVisible, setAddMemberFormVisible] = useState(false);
  const [addConnectorFormVisible, setAddConnectorFormVisible] = useState(false);

  return (
    <div>
      {popup}

      <div className="text-sm mb-3 flex">
        <b className="mr-1">Status:</b>{" "}
        {userGroup.is_up_to_date ? (
          <div className="text-emerald-600">Up to date</div>
        ) : (
          <div className="text-gray-300">
            <LoadingAnimation text="Syncing" />
          </div>
        )}
      </div>

      <div className="flex w-full">
        <h2 className="text-xl font-bold">Users</h2>
      </div>

      <div className="mt-2">
        {userGroup.users.length > 0 ? (
          <BasicTable
            columns={[
              {
                header: "Email",
                key: "email",
              },
              {
                header: "Remove User",
                key: "remove",
                alignment: "right",
              },
            ]}
            data={userGroup.users.map((user) => {
              return {
                email: <div>{user.email}</div>,
                remove: (
                  <div className="flex">
                    <div
                      className="cursor-pointer ml-auto mr-1"
                      onClick={async () => {
                        const response = await updateUserGroup(userGroup.id, {
                          user_ids: userGroup.users
                            .filter(
                              (userGroupUser) => userGroupUser.id !== user.id
                            )
                            .map((userGroupUser) => userGroupUser.id),
                          cc_pair_ids: userGroup.cc_pairs.map(
                            (ccPair) => ccPair.id
                          ),
                        });
                        if (response.ok) {
                          setPopup({
                            message: "Successfully removed user from group",
                            type: "success",
                          });
                        } else {
                          const responseJson = await response.json();
                          const errorMsg =
                            responseJson.detail || responseJson.message;
                          setPopup({
                            message: `Error removing user from group - ${errorMsg}`,
                            type: "error",
                          });
                        }
                        refreshUserGroup();
                      }}
                    >
                      <TrashIcon />
                    </div>
                  </div>
                ),
              };
            })}
          />
        ) : (
          <div className="text-sm">No users in this group...</div>
        )}
      </div>

      <Button
        className="mt-3"
        onClick={() => setAddMemberFormVisible(true)}
        disabled={!userGroup.is_up_to_date}
      >
        Add Users
      </Button>

      {addMemberFormVisible && (
        <AddMemberForm
          users={users}
          userGroup={userGroup}
          onClose={() => {
            setAddMemberFormVisible(false);
            refreshUserGroup();
          }}
          setPopup={setPopup}
        />
      )}

      <h2 className="text-xl font-bold mt-4">Connectors</h2>
      <div className="mt-2">
        {userGroup.cc_pairs.length > 0 ? (
          <BasicTable
            columns={[
              {
                header: "Connector",
                key: "connector_name",
              },
              {
                header: "Remove Connector",
                key: "delete",
                alignment: "right",
              },
            ]}
            data={userGroup.cc_pairs.map((ccPair) => {
              return {
                connector_name:
                  (
                    <ConnectorTitle
                      connector={ccPair.connector}
                      ccPairId={ccPair.id}
                      ccPairName={ccPair.name}
                    />
                  ) || "",
                delete: (
                  <div className="flex">
                    <div
                      className="cursor-pointer ml-auto mr-1"
                      onClick={async () => {
                        const response = await updateUserGroup(userGroup.id, {
                          user_ids: userGroup.users.map(
                            (userGroupUser) => userGroupUser.id
                          ),
                          cc_pair_ids: userGroup.cc_pairs
                            .filter(
                              (userGroupCCPair) =>
                                userGroupCCPair.id != ccPair.id
                            )
                            .map((ccPair) => ccPair.id),
                        });
                        if (response.ok) {
                          setPopup({
                            message:
                              "Successfully removed connector from group",
                            type: "success",
                          });
                        } else {
                          const responseJson = await response.json();
                          const errorMsg =
                            responseJson.detail || responseJson.message;
                          setPopup({
                            message: `Error removing connector from group - ${errorMsg}`,
                            type: "error",
                          });
                        }
                        refreshUserGroup();
                      }}
                    >
                      <TrashIcon />
                    </div>
                  </div>
                ),
              };
            })}
          />
        ) : (
          <div className="text-sm">No connectors in this group...</div>
        )}
      </div>

      <Button
        className="mt-3"
        onClick={() => setAddConnectorFormVisible(true)}
        disabled={!userGroup.is_up_to_date}
      >
        Add Connectors
      </Button>

      {addConnectorFormVisible && (
        <AddConnectorForm
          ccPairs={ccPairs}
          userGroup={userGroup}
          onClose={() => {
            setAddConnectorFormVisible(false);
            refreshUserGroup();
          }}
          setPopup={setPopup}
        />
      )}
    </div>
  );
};
