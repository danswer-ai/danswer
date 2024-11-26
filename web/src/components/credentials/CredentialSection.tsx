"use client";

import { ValidSources } from "@/lib/types";
import useSWR, { mutate } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { FaSwatchbook } from "react-icons/fa";
import { useState } from "react";
import {
  deleteCredential,
  swapCredential,
  updateCredential,
} from "@/lib/credential";
import CreateCredential from "./actions/CreateCredential";
import { CCPairFullInfo } from "@/app/admin/connector/[ccPairId]/types";
import ModifyCredential from "./actions/ModifyCredential";
import { Text } from "@tremor/react";
import {
  buildCCPairInfoUrl,
  buildSimilarCredentialInfoURL,
} from "@/app/admin/connector/[ccPairId]/lib";
import { Modal } from "../Modal";
import EditCredential from "./actions/EditCredential";
import { getSourceDisplayName } from "@/lib/sources";
import {
  ConfluenceCredentialJson,
  Credential,
} from "@/lib/connectors/credentials";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "../CustomModal";
import { Button } from "../ui/button";

export default function CredentialSection({
  ccPair,
  sourceType,
  refresh,
}: {
  ccPair: CCPairFullInfo;
  sourceType: ValidSources;
  refresh: () => void;
}) {
  const { toast } = useToast();
  const makeShowCreateCredential = () => {
    setShowModifyCredential(false);
    setShowCreateCredential(true);
  };

  const { data: credentials } = useSWR<Credential<ConfluenceCredentialJson>[]>(
    buildSimilarCredentialInfoURL(sourceType),
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  const { data: editableCredentials } = useSWR<Credential<any>[]>(
    buildSimilarCredentialInfoURL(sourceType, true),
    errorHandlingFetcher,
    { refreshInterval: 5000 }
  );

  const onSwap = async (
    selectedCredential: Credential<any>,
    connectorId: number
  ) => {
    await swapCredential(selectedCredential.id, connectorId);
    mutate(buildSimilarCredentialInfoURL(sourceType));
    refresh();

    toast({
      title: "Swap Failed",
      description:
        "There was an issue swapping the credential. Please try again.",
      variant: "destructive",
    });
  };

  const onUpdateCredential = async (
    selectedCredential: Credential<any | null>,
    details: any,
    onSucces: () => void
  ) => {
    const response = await updateCredential(selectedCredential.id, details);
    if (response.ok) {
      toast({
        title: "Success",
        description: "Credential updated successfully!",
        variant: "success",
      });
      onSucces();
    } else {
      toast({
        title: "Update Failed",
        description: `Issue updating credential`,
        variant: "destructive",
      });
    }
  };

  const onEditCredential = (credential: Credential<any>) => {
    closeModifyCredential();
    setEditingCredential(credential);
  };

  const onDeleteCredential = async (credential: Credential<any | null>) => {
    await deleteCredential(credential.id, true);
    mutate(buildCCPairInfoUrl(ccPair.id));
  };
  const defaultedCredential = ccPair.credential;

  const [showModifyCredential, setShowModifyCredential] = useState(false);
  const [showCreateCredential, setShowCreateCredential] = useState(false);
  const [editingCredential, setEditingCredential] =
    useState<Credential<any> | null>(null);

  const closeModifyCredential = () => {
    setShowModifyCredential(false);
  };

  const closeCreateCredential = () => {
    setShowCreateCredential(false);
  };

  const closeEditingCredential = () => {
    setEditingCredential(null);
    setShowModifyCredential(true);
  };

  if (!credentials || !editableCredentials) {
    return <></>;
  }

  return (
    <div className="flex justify-start flex-col gap-y-2">
      <div className="flex gap-x-2">
        <p>Current credential:</p>
        <Text className="ml-1 italic font-bold my-auto">
          {ccPair.credential.name || `Credential #${ccPair.credential.id}`}
        </Text>
      </div>
      <div className="flex text-sm justify-start mr-auto gap-x-2">
        <Button
          onClick={() => {
            setShowModifyCredential(true);
          }}
          variant="outline"
        >
          <FaSwatchbook />
          Update Credentials
        </Button>
      </div>
      {showModifyCredential && (
        <CustomModal
          onClose={closeModifyCredential}
          title="Update Credentials"
          trigger={null}
          open={showModifyCredential}
        >
          <ModifyCredential
            showCreate={() => {
              setShowCreateCredential(true);
            }}
            close={closeModifyCredential}
            source={sourceType}
            attachedConnector={ccPair.connector}
            defaultedCredential={defaultedCredential}
            credentials={credentials}
            editableCredentials={editableCredentials}
            onDeleteCredential={onDeleteCredential}
            onEditCredential={(credential: Credential<any>) =>
              onEditCredential(credential)
            }
            onSwap={onSwap}
            onCreateNew={() => makeShowCreateCredential()}
          />
        </CustomModal>
      )}

      {editingCredential && (
        <CustomModal
          onClose={closeEditingCredential}
          title="Edit Credential"
          trigger={null}
          open={!!editingCredential}
        >
          <EditCredential
            onUpdate={onUpdateCredential}
            credential={editingCredential}
            onClose={closeEditingCredential}
          />
        </CustomModal>
      )}

      {showCreateCredential && (
        <CustomModal
          onClose={closeCreateCredential}
          title={`Create ${getSourceDisplayName(sourceType)} Credential`}
          trigger={null}
          open={showCreateCredential}
        >
          <CreateCredential
            sourceType={sourceType}
            swapConnector={ccPair.connector}
            onSwap={onSwap}
            onClose={closeCreateCredential}
          />
        </CustomModal>
      )}
    </div>
  );
}
