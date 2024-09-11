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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Pen } from "lucide-react";

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
  refresh: () => void;
}

export const TeamspacesTable = ({
  teamspaces,
  refresh,
}: TeamspacesTableProps) => {
  const router = useRouter();
  const { toast } = useToast();

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
    <Card>
      <CardContent className="p-0">
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
                      <Link href={`/admin/teams/${teamspace.id}`}>
                        <Button variant="ghost">
                          <Pen size={16} />
                          <p className="text font-medium">{teamspace.name}</p>
                        </Button>
                      </Link>
                    </TableCell>
                    <TableCell>
                      {teamspace.cc_pairs.length > 0 ? (
                        <div>
                          {teamspace.cc_pairs.map((ccPairDescriptor, ind) => {
                            return (
                              <Badge
                                className={
                                  ind !== teamspace.cc_pairs.length - 1
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
                                +{" "}
                                {teamspace.users.length - MAX_USERS_TO_DISPLAY}{" "}
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
                      {!teamspace.is_up_to_date ? (
                        <Badge variant="success" className="whitespace-nowrap">
                          Up to date!
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-20">
                          <LoadingAnimation text="Syncing" />
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <DeleteButton
                        onClick={async (event) => {
                          event.stopPropagation();
                          const response = await deleteTeamspace(teamspace.id);
                          if (response.ok) {
                            toast({
                              title: "Success",
                              description: `Teamspace "${teamspace.name}" deleted`,
                              variant: "success",
                            });
                          } else {
                            const errorMsg = (await response.json()).detail;
                            toast({
                              title: "Error",
                              description: `Failed to delete Teamspace - ${errorMsg}`,
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
      </CardContent>
    </Card>
  );
};
