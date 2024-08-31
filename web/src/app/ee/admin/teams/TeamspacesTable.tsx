"use client";

import { PopupSpec } from "@/components/admin/connectors/Popup";
import { LoadingAnimation } from "@/components/Loading";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { TrashIcon } from "@/components/icons/icons";
import { deleteTeamspace } from "./lib";
import { useRouter } from "next/navigation";
import { FiEdit2, FiUser } from "react-icons/fi";
import { User, Teamspace } from "@/lib/types";
import Link from "next/link";
import { DeleteButton } from "@/components/DeleteButton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const MAX_USERS_TO_DISPLAY = 6;

const SimpleUserDisplay = ({ user }: { user: User }) => {
  return (
    <div className="flex my-0.5">
      <FiUser className="mr-2 my-auto" /> {user.email}
    </div>
  );
};

interface TeamspacesTableProps {
  teamspaces: Teamspace[];
  setPopup: (popupSpec: PopupSpec | null) => void;
  refresh: () => void;
}

export const TeamspacesTable = ({
  teamspaces,
  setPopup,
  refresh,
}: TeamspacesTableProps) => {
  const router = useRouter();

  // sort by name for consistent ordering
  teamspaces.sort((a, b) => {
    if (a.name < b.name) {
      return -1;
    } else if (a.name > b.name) {
      return 1;
    } else {
      return 0;
    }
  });

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Connectors</TableHead>
            <TableHead>Users</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Delete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {teamspaces
            .filter((teamspace) => !teamspace.is_up_for_deletion)
            .map((teamspace) => {
              return (
                <TableRow key={teamspace.id}>
                  <TableCell>
                    <Link
                      className="whitespace-normal break-all flex cursor-pointer p-2 rounded hover:bg-hover w-fit"
                      href={`/admin/teams/${teamspace.id}`}
                    >
                      <FiEdit2 className="my-auto mr-2" />
                      <p className="text font-medium">{teamspace.name}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {teamspace.cc_pairs.length > 0 ? (
                      <div>
                        {teamspace.cc_pairs.map((ccPairDescriptor, ind) => {
                          return (
                            <div
                              className={
                                ind !== teamspace.cc_pairs.length - 1
                                  ? "mb-3"
                                  : ""
                              }
                              key={ccPairDescriptor.id}
                            >
                              <ConnectorTitle
                                connector={ccPairDescriptor.connector}
                                ccPairId={ccPairDescriptor.id}
                                ccPairName={ccPairDescriptor.name}
                                showMetadata={false}
                              />
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {teamspace.users.length > 0 ? (
                      <div>
                        {teamspace.users.length <= MAX_USERS_TO_DISPLAY ? (
                          teamspace.users.map((user) => {
                            return (
                              <SimpleUserDisplay key={user.id} user={user} />
                            );
                          })
                        ) : (
                          <div>
                            {teamspace.users
                              .slice(0, MAX_USERS_TO_DISPLAY)
                              .map((user) => {
                                return (
                                  <SimpleUserDisplay
                                    key={user.id}
                                    user={user}
                                  />
                                );
                              })}
                            <div>
                              + {teamspace.users.length - MAX_USERS_TO_DISPLAY}{" "}
                              more
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {teamspace.is_up_to_date ? (
                      <div className="text-success">Up to date!</div>
                    ) : (
                      <div className="w-10">
                        <LoadingAnimation text="Syncing" />
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      onClick={async (event) => {
                        event.stopPropagation();
                        const response = await deleteTeamspace(teamspace.id);
                        if (response.ok) {
                          setPopup({
                            message: `Teamspace "${teamspace.name}" deleted`,
                            type: "success",
                          });
                        } else {
                          const errorMsg = (await response.json()).detail;
                          setPopup({
                            message: `Failed to delete Teamspace - ${errorMsg}`,
                            type: "error",
                          });
                        }
                        refresh();
                      }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div>
      <BasicTable
        columns={[
          {
            header: "Name",
            key: "name",
          },
          {
            header: "Connectors",
            key: "ccPairs",
          },
          {
            header: "Users",
            key: "users",
          },
          {
            header: "Status",
            key: "status",
          },
          {
            header: "Delete",
            key: "delete",
          },
        ]}
        data={teamspaces
          .filter((teamspace) => !teamspace.is_up_for_deletion)
          .map((teamspace) => {
            return {
              id: teamspace.id,
              name: teamspace.name,
              ccPairs: (
                <div>
                  {teamspace.cc_pairs.map((ccPairDescriptor, ind) => {
                    return (
                      <div
                        className={
                          ind !== teamspace.cc_pairs.length - 1 ? "mb-3" : ""
                        }
                        key={ccPairDescriptor.id}
                      >
                        <ConnectorTitle
                          connector={ccPairDescriptor.connector}
                          ccPairId={ccPairDescriptor.id}
                          ccPairName={ccPairDescriptor.name}
                          showMetadata={false}
                        />
                      </div>
                    );
                  })}
                </div>
              ),
              users: (
                <div>
                  {teamspace.users.length <= MAX_USERS_TO_DISPLAY ? (
                    teamspace.users.map((user) => {
                      return <SimpleUserDisplay key={user.id} user={user} />;
                    })
                  ) : (
                    <div>
                      {teamspace.users
                        .slice(0, MAX_USERS_TO_DISPLAY)
                        .map((user) => {
                          return (
                            <SimpleUserDisplay key={user.id} user={user} />
                          );
                        })}
                      <div className="text-gray-300">
                        + {teamspace.users.length - MAX_USERS_TO_DISPLAY} more
                      </div>
                    </div>
                  )}
                </div>
              ),
              status: teamspace.is_up_to_date ? (
                <div className="text-emerald-600">Up to date!</div>
              ) : (
                <div className="text-gray-300 w-10">
                  <LoadingAnimation text="Syncing" />
                </div>
              ),
              delete: (
                <div
                  className="cursor-pointer"
                  onClick={async (event) => {
                    event.stopPropagation();
                    const response = await deleteTeamspace(teamspace.id);
                    if (response.ok) {
                      setPopup({
                        message: `Teamspace "${teamspace.name}" deleted`,
                        type: "success",
                      });
                    } else {
                      const errorMsg = (await response.json()).detail;
                      setPopup({
                        message: `Failed to delete Teamspace - ${errorMsg}`,
                        type: "error",
                      });
                    }
                    refresh();
                  }}
                >
                  <TrashIcon />
                </div>
              ),
            };
          })}
        onSelect={(data) => {
          router.push(`/admin/teams/${data.id}`);
        }}
      />
    </div>
  );
};
