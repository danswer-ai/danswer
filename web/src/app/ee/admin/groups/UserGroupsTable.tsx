"use client";

import { PopupSpec } from "@/components/admin/connectors/Popup";
import { LoadingAnimation } from "@/components/Loading";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { TrashIcon } from "@/components/icons/icons";
import { deleteUserGroup } from "./lib";
import { useRouter } from "next/navigation";
import { FiEdit2, FiUser } from "react-icons/fi";
import { User, UserGroup } from "@/lib/types";
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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

const MAX_USERS_TO_DISPLAY = 6;

const SimpleUserDisplay = ({ user }: { user: User }) => {
  return (
    <div className="flex my-0.5">
      <FiUser className="mr-2 my-auto" /> {user.email}
    </div>
  );
};

interface UserGroupsTableProps {
  userGroups: UserGroup[];
  refresh: () => void;
}

export const UserGroupsTable = ({
  userGroups,
  refresh,
}: UserGroupsTableProps) => {
  const router = useRouter();
  const { toast } = useToast();

  // sort by name for consistent ordering
  userGroups.sort((a, b) => {
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
          {userGroups
            .filter((userGroup) => !userGroup.is_up_for_deletion)
            .map((userGroup) => {
              return (
                <TableRow key={userGroup.id}>
                  <TableCell>
                    <Link
                      className="whitespace-normal break-all flex cursor-pointer p-2 rounded hover:bg-hover w-fit"
                      href={`/admin/groups/${userGroup.id}`}
                    >
                      <FiEdit2 className="my-auto mr-2" />
                      <p className="text font-medium">{userGroup.name}</p>
                    </Link>
                  </TableCell>
                  <TableCell>
                    {userGroup.cc_pairs.length > 0 ? (
                      <div>
                        {userGroup.cc_pairs.map((ccPairDescriptor, ind) => {
                          return (
                            <Badge
                              className={
                                ind !== userGroup.cc_pairs.length - 1
                                  ? "mb-3"
                                  : ""
                              }
                              variant="outline"
                              key={ccPairDescriptor.id}
                            >
                              <ConnectorTitle
                                connector={ccPairDescriptor.connector}
                                ccPairId={ccPairDescriptor.id}
                                ccPairName={ccPairDescriptor.name}
                                showMetadata={false}
                              />
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    {userGroup.users.length > 0 ? (
                      <div>
                        {userGroup.users.length <= MAX_USERS_TO_DISPLAY ? (
                          userGroup.users.map((user) => {
                            return (
                              <SimpleUserDisplay key={user.id} user={user} />
                            );
                          })
                        ) : (
                          <div>
                            {userGroup.users
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
                              + {userGroup.users.length - MAX_USERS_TO_DISPLAY}{" "}
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
                    {userGroup.is_up_to_date ? (
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
                        const response = await deleteUserGroup(userGroup.id);
                        if (response.ok) {
                          toast({
                            title: "Success",
                            description: `User Group "${userGroup.name}" deleted`,
                            variant: "success",
                          });
                        } else {
                          const errorMsg = (await response.json()).detail;
                          toast({
                            title: "Error",
                            description: `Failed to delete User Group - ${errorMsg}`,
                            variant: "destructive",
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
};
