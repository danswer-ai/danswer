"use client";

import { useState } from "react";
import { ConnectorTitle } from "@/components/admin/connectors/ConnectorTitle";
import { AddMemberForm } from "./AddMemberForm";
import { updateTeamspace } from "./lib";
import { LoadingAnimation } from "@/components/Loading";
import { ConnectorIndexingStatus, User, Teamspace } from "@/lib/types";
import { AddConnectorForm } from "./AddConnectorForm";
import { DeleteButton } from "@/components/DeleteButton";
import { Bubble } from "@/components/Bubble";
import { BookmarkIcon, RobotIcon } from "@/components/icons/icons";
import { AddTokenRateLimitForm } from "./AddTokenRateLimitForm";
import { GenericTokenRateLimitTable } from "@/app/admin/token-rate-limits/TokenRateLimitTables";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { CustomModal } from "@/components/CustomModal";

interface GroupDisplayProps {
  users: User[];
  ccPairs: ConnectorIndexingStatus<any, any>[];
  teamspace: Teamspace;
  refreshTeamspace: () => void;
}

export const GroupDisplay = ({
  users,
  ccPairs,
  teamspace,
  refreshTeamspace,
}: GroupDisplayProps) => {
  const { toast } = useToast();
  const [addMemberFormVisible, setAddMemberFormVisible] = useState(false);
  const [addConnectorFormVisible, setAddConnectorFormVisible] = useState(false);
  const [modalIsOpen, setModalIsOpen] = useState(false);

  return (
    <div>
      <div className="text-sm flex">
        <p className="mr-1">Status:</p>{" "}
        {teamspace.is_up_to_date ? (
          <Badge variant="success">Up to date!</Badge>
        ) : (
          <Badge variant="outline" className="w-20">
            <LoadingAnimation text="Syncing" />
          </Badge>
        )}
      </div>

      {/*  <div className="pt-2" /> */}

      <h2 className="text-xl font-bold pt-8">Users</h2>

      <div className="pt-4">
        {teamspace.users.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead className="ml-auto flex">
                      <span className="m-auto mr-0">Remove User</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamspace.users.map((user) => {
                    return (
                      <TableRow key={user.id}>
                        <TableCell className="whitespace-normal break-all">
                          {user.email}
                        </TableCell>
                        <TableCell className="ml-auto flex">
                          <span className="m-auto mr-0">
                            <DeleteButton
                              onClick={async () => {
                                const response = await updateTeamspace(
                                  teamspace.id,
                                  {
                                    user_ids: teamspace.users
                                      .filter(
                                        (teamspaceUser) =>
                                          teamspaceUser.id !== user.id
                                      )
                                      .map((teamspaceUser) => teamspaceUser.id),
                                    cc_pair_ids: teamspace.cc_pairs.map(
                                      (ccPair) => ccPair.id
                                    ),
                                  }
                                );
                                if (response.ok) {
                                  toast({
                                    title: "Success",
                                    description:
                                      "Successfully removed user from group",
                                    variant: "success",
                                  });
                                } else {
                                  const responseJson = await response.json();
                                  const errorMsg =
                                    responseJson.detail || responseJson.message;
                                  toast({
                                    title: "Error",
                                    description: `Error removing user from group - ${errorMsg}`,
                                    variant: "destructive",
                                  });
                                }
                                refreshTeamspace();
                              }}
                            />
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="text-sm">No users in this group...</div>
        )}
      </div>

      <CustomModal
        trigger={
          <Button
            className="mt-4"
            onClick={() => setAddMemberFormVisible(true)}
            disabled={!teamspace.is_up_to_date}
          >
            Add Users
          </Button>
        }
        onClose={() => setAddMemberFormVisible(false)}
        open={addMemberFormVisible}
        title="Add New User"
      >
        <AddMemberForm
          users={users}
          teamspace={teamspace}
          onClose={() => {
            setAddMemberFormVisible(false);
            refreshTeamspace();
          }}
        />
      </CustomModal>

      {/*  <div className="pt-2" /> */}

      <h2 className="text-xl font-bold pt-8">Connectors</h2>
      <div className="mt-4">
        {teamspace.cc_pairs.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Connector</TableHead>
                    <TableHead className="ml-auto flex">
                      <span className="m-auto mr-0">Remove Connector</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamspace.cc_pairs.map((ccPair) => {
                    return (
                      <TableRow key={ccPair.id}>
                        <TableCell className="whitespace-normal break-all">
                          <ConnectorTitle
                            connector={ccPair.connector}
                            ccPairId={ccPair.id}
                            ccPairName={ccPair.name}
                          />
                        </TableCell>
                        <TableCell className="ml-auto flex">
                          <span className="m-auto mr-0">
                            <DeleteButton
                              onClick={async () => {
                                const response = await updateTeamspace(
                                  teamspace.id,
                                  {
                                    user_ids: teamspace.users.map(
                                      (teamspaceUser) => teamspaceUser.id
                                    ),
                                    cc_pair_ids: teamspace.cc_pairs
                                      .filter(
                                        (teamspaceCCPair) =>
                                          teamspaceCCPair.id != ccPair.id
                                      )
                                      .map((ccPair) => ccPair.id),
                                  }
                                );
                                if (response.ok) {
                                  toast({
                                    title: "Success",
                                    description:
                                      "Successfully removed connector from group",
                                    variant: "success",
                                  });
                                } else {
                                  const responseJson = await response.json();
                                  const errorMsg =
                                    responseJson.detail || responseJson.message;
                                  toast({
                                    title: "Error",
                                    description: `Error removing connector from group - ${errorMsg}`,
                                    variant: "destructive",
                                  });
                                }
                                refreshTeamspace();
                              }}
                            />
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <div className="text-sm">No connectors in this group...</div>
        )}
      </div>

      <CustomModal
        trigger={
          <Button
            className="mt-4"
            onClick={() => setAddConnectorFormVisible(true)}
            disabled={!teamspace.is_up_to_date}
          >
            Add Connectors
          </Button>
        }
        onClose={() => setAddConnectorFormVisible(false)}
        open={addConnectorFormVisible}
        title="Add New Connector"
      >
        <AddConnectorForm
          ccPairs={ccPairs}
          teamspace={teamspace}
          onClose={() => {
            setAddConnectorFormVisible(false);
            refreshTeamspace();
          }}
        />
      </CustomModal>

      {/*  <div className="pt-2" /> */}

      <h2 className="text-xl font-bold mb-2 pt-8">Document Sets</h2>

      <div>
        {teamspace.document_sets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {teamspace.document_sets.map((documentSet) => {
              return (
                <Bubble isSelected key={documentSet.id}>
                  <div className="flex">
                    <BookmarkIcon />
                    <p className="ml-1 text-sm">{documentSet.name}</p>
                  </div>
                </Bubble>
              );
            })}
          </div>
        ) : (
          <>
            <p className="text-sm">No document sets in this group...</p>
          </>
        )}
      </div>

      {/*  <div className="pt-2" /> */}

      <h2 className="text-xl font-bold pt-8 mb-2">Assistants</h2>

      <div>
        {teamspace.document_sets.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {teamspace.assistants.map((assistant) => {
              return (
                <Bubble isSelected key={assistant.id}>
                  <div className="flex">
                    <RobotIcon />
                    <p className="ml-1 text-sm">{assistant.name}</p>
                  </div>
                </Bubble>
              );
            })}
          </div>
        ) : (
          <>
            <p className="text-sm">No Assistants in this group...</p>
          </>
        )}
      </div>

      {/*  <div className="pt-2" /> */}

      <h2 className="text-xl font-bold pt-8 mb-2">Token Rate Limits</h2>

      <GenericTokenRateLimitTable
        fetchUrl={`/api/admin/token-rate-limits/teamspace/${teamspace.id}`}
        hideHeading
      />

      <AddTokenRateLimitForm teamspaceId={teamspace.id} />
    </div>
  );
};
