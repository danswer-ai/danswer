import React, { useState, useEffect } from "react";
import { Text } from "@tremor/react";
import { ValidSources } from "@/lib/types";
import {
  EditIcon,
  NewChatIcon,
  SwapIcon,
  TrashIcon,
} from "@/components/icons/icons";
import {
  ConfluenceCredentialJson,
  Credential,
} from "@/lib/connectors/credentials";
import { Connector } from "@/lib/connectors/connectors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeleteModal } from "@/components/DeleteModal";
import { Badge } from "@/components/ui/badge";
import { CustomTooltip } from "@/components/CustomTooltip";

const CredentialSelectionTable = ({
  credentials,
  editableCredentials,
  onEditCredential,
  onSelectCredential,
  currentCredentialId,
  onDeleteCredential,
}: {
  credentials: Credential<any>[];
  editableCredentials: Credential<any>[];
  onSelectCredential: (credential: Credential<any> | null) => void;
  currentCredentialId?: number;
  onDeleteCredential: (credential: Credential<any>) => void;
  onEditCredential?: (credential: Credential<any>) => void;
}) => {
  const [selectedCredentialId, setSelectedCredentialId] = useState<
    number | null
  >(null);

  const allCredentials = React.useMemo(() => {
    const credMap = new Map(editableCredentials.map((cred) => [cred.id, cred]));
    credentials.forEach((cred) => {
      if (!credMap.has(cred.id)) {
        credMap.set(cred.id, cred);
      }
    });
    return Array.from(credMap.values());
  }, [credentials, editableCredentials]);

  const handleSelectCredential = (credentialId: number) => {
    const newSelectedId =
      selectedCredentialId === credentialId ? null : credentialId;
    setSelectedCredentialId(newSelectedId);

    const selectedCredential =
      allCredentials.find((cred) => cred.id === newSelectedId) || null;
    onSelectCredential(selectedCredential);
  };

  return (
    <div className="w-full overflow-auto">
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead />
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Last Updated</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>

            {allCredentials.length > 0 && (
              <TableBody>
                {allCredentials.map((credential, ind) => {
                  const selected = currentCredentialId
                    ? credential.id ==
                      (selectedCredentialId || currentCredentialId)
                    : false;
                  const editable = editableCredentials.some(
                    (editableCredential) =>
                      editableCredential.id === credential.id
                  );
                  return (
                    <TableRow key={credential.id}>
                      <TableCell className="min-w-[60px]">
                        {!selected ? (
                          <input
                            type="radio"
                            name="credentialSelection"
                            onChange={() =>
                              handleSelectCredential(credential.id)
                            }
                            className="w-4 h-4 ml-4 text-blue-600 transition duration-150 ease-in-out form-radio"
                          />
                        ) : (
                          <Badge>Selected</Badge>
                        )}
                      </TableCell>
                      <TableCell>{credential.id}</TableCell>
                      <TableCell>
                        <p>{credential.name ?? "Untitled"}</p>
                      </TableCell>
                      <TableCell>
                        {new Date(credential.time_created).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {new Date(credential.time_updated).toLocaleString()}
                      </TableCell>
                      <TableCell className="flex content-center gap-x-2">
                        <CustomTooltip
                          trigger={
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={selected || !editable}
                              onClick={async () => {
                                onDeleteCredential(credential);
                              }}
                              className="my-auto disabled:opacity-20 enabled:cursor-pointer"
                            >
                              <TrashIcon />
                            </Button>
                          }
                          variant="destructive"
                        >
                          Delete
                        </CustomTooltip>
                        {onEditCredential && (
                          <button
                            disabled={!editable}
                            onClick={() => onEditCredential(credential)}
                            className="my-auto cursor-pointer"
                          >
                            <EditIcon />
                          </button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>

      {allCredentials.length == 0 && (
        <p className="mt-4"> No credentials exist for this connector!</p>
      )}
    </div>
  );
};

export default function ModifyCredential({
  close,
  showIfEmpty,
  attachedConnector,
  credentials,
  editableCredentials,
  source,
  defaultedCredential,

  onSwap,
  onSwitch,
  onCreateNew = () => null,
  onEditCredential,
  onDeleteCredential,
  showCreate,
}: {
  close?: () => void;
  showIfEmpty?: boolean;
  attachedConnector?: Connector<any>;
  defaultedCredential?: Credential<any>;
  credentials: Credential<any>[];
  editableCredentials: Credential<any>[];
  source: ValidSources;

  onSwitch?: (newCredential: Credential<any>) => void;
  onSwap?: (newCredential: Credential<any>, connectorId: number) => void;
  onCreateNew?: () => void;
  onDeleteCredential: (credential: Credential<any | null>) => void;
  onEditCredential?: (credential: Credential<ConfluenceCredentialJson>) => void;
  showCreate?: () => void;
}) {
  const [selectedCredential, setSelectedCredential] =
    useState<Credential<any> | null>(null);
  const [confirmDeletionCredential, setConfirmDeletionCredential] =
    useState<null | Credential<any>>(null);

  if (!credentials || !editableCredentials) {
    return <></>;
  }

  return (
    <>
      {confirmDeletionCredential != null && (
        <DeleteModal
          title="Are you sure you want to delete this credential? You cannot delete
          credentials that are linked to live connectors."
          onClose={() => setConfirmDeletionCredential(null)}
          open={confirmDeletionCredential != null}
          description="You are about to remove this user on the teamspace."
          onSuccess={async () => {
            await onDeleteCredential(confirmDeletionCredential);
            setConfirmDeletionCredential(null);
          }}
        />
      )}

      <div className="mb-0">
        <Text className="mb-4">
          Select a credential as needed! Ensure that you have selected a
          credential with the proper permissions for this connector!
        </Text>

        <CredentialSelectionTable
          onDeleteCredential={async (credential: Credential<any | null>) => {
            setConfirmDeletionCredential(credential);
          }}
          onEditCredential={
            onEditCredential
              ? (credential: Credential<ConfluenceCredentialJson>) =>
                  onEditCredential(credential)
              : undefined
          }
          currentCredentialId={
            defaultedCredential ? defaultedCredential.id : undefined
          }
          credentials={credentials}
          editableCredentials={editableCredentials}
          onSelectCredential={(credential: Credential<any> | null) => {
            if (credential && onSwitch) {
              onSwitch(credential);
            } else {
              setSelectedCredential(credential);
            }
          }}
        />

        {!showIfEmpty && (
          <div className="flex justify-between mt-8">
            {showCreate ? (
              <Button
                variant="success"
                onClick={() => {
                  showCreate();
                }}
              >
                <div className="flex items-center w-full border-none gap-x-2">
                  <NewChatIcon className="text-white" />
                  <p>Create</p>
                </div>
              </Button>
            ) : (
              <div />
            )}

            <Button
              disabled={selectedCredential == null}
              onClick={() => {
                if (onSwap && attachedConnector) {
                  onSwap(selectedCredential!, attachedConnector.id);
                  if (close) {
                    close();
                  }
                }
                if (onSwitch) {
                  onSwitch(selectedCredential!);
                }
              }}
            >
              <div className="flex items-center w-full border-none gap-x-2">
                <SwapIcon className="text-white" />
                <p>Select</p>
              </div>
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
