"use client";

import { Credential, ValidSources } from "@/lib/types";
import useSWR, { mutate } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ThreeDotsLoader } from "@/components/Loading";

import { FaSwatchbook } from "react-icons/fa";
import { NewChatIcon } from "@/components/icons/icons";
import { Dispatch, SetStateAction, useState } from "react";
import {
  deleteCredential,
  forceDeleteCredential,
  swapCredential,
  updateCredential,
} from "@/lib/credential";

import { usePopup } from "@/components/admin/connectors/Popup";

import CreateCredential from "./CreateCredential";
import { CCPairFullInfo } from "@/app/admin/connector/[ccPairId]/types";
import ModifyCredential from "./ModifyCredential";
import EditCredential from "./EditCredential";
import { Text } from "@tremor/react";
import { buildCCPairInfoUrl } from "@/app/admin/connector/[ccPairId]/lib";
import { Modal } from "../Modal";

export default function CredentialSection({
  ccPair,
}: {
  ccPair: CCPairFullInfo;
}) {
  const makeShowCreateCredential = () => {
    setShowModifyCredential(false);
    setShowCreateCredential(true);
  };

  const onSwap = async (selectedCredentialId: number, connectorId: number) => {
    await swapCredential(selectedCredentialId, connectorId);
    mutate(buildCCPairInfoUrl(ccPair.id));

    setPopup({
      message: "Swapped credential succesfully!",
      type: "success",
    });
  };

  const onUpdateCredential = async (
    selectedCredential: Credential<any | null>,
    details: any,
    onSucces: () => void
  ) => {
    const response = await updateCredential(selectedCredential.id, details);
    if (response.ok) {
      setPopup({
        message: "Updated credential",
        type: "success",
      });
      onSucces();
    } else {
      setPopup({
        message: "Issue updating credential",
        type: "error",
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
  const { popup, setPopup } = usePopup();

  return (
    <div className="flex justify-start flex-col gap-y-2">
      {popup}

      <div className="flex gap-x-2">
        <p>Current credential:</p>
        <Text className="ml-1 italic font-bold my-auto">
          {ccPair.credential.name || `Credential #${ccPair.credential.id}`}
        </Text>
      </div>
      <div className="flex text-sm justify-start mr-auto gap-x-2">
        <button
          onClick={() => setShowModifyCredential(true)}
          className="flex items-center gap-x-2 cursor-pointer bg-neutral-100 border-border border-2 hover:bg-border p-1.5 rounded-lg text-neutral-700"
        >
          <FaSwatchbook />
          Swap credential
        </button>
        <button
          onClick={() => setShowCreateCredential(true)}
          className="flex items-center gap-x-2 cursor-pointer bg-neutral-100 border-border border-2 hover:bg-border p-1.5 rounded-lg text-neutral-700"
        >
          <NewChatIcon />
          New Credential
        </button>
      </div>
      {showModifyCredential && (
        <Modal
          onOutsideClick={closeModifyCredential}
          className="max-w-2xl rounded-lg"
          title="Modify Credential"
        >
          <ModifyCredential
            setPopup={setPopup}
            ccPair={ccPair}
            onDeleteCredential={onDeleteCredential}
            onEditCredential={(credential: Credential<any>) =>
              onEditCredential(credential)
            }
            onSwap={onSwap}
            onCreateNew={() => makeShowCreateCredential()}
            onClose={() => closeModifyCredential()}
          />
        </Modal>
      )}

      {editingCredential && (
        <Modal
          onOutsideClick={closeEditingCredential}
          className="max-w-2xl rounded-lg"
          title="Edit Credential"
        >
          <EditCredential
            onUpdate={onUpdateCredential}
            setPopup={setPopup}
            credential={editingCredential}
            onClose={closeEditingCredential}
          />
        </Modal>
      )}

      {showCreateCredential && (
        <Modal
          onOutsideClick={closeCreateCredential}
          className="max-w-2xl rounded-lg"
          title={`Create Credential`}
        >
          <CreateCredential
            ccPair={ccPair}
            setPopup={setPopup}
            onSwap={onSwap}
            onCreateNew={() => makeShowCreateCredential()}
            onClose={closeCreateCredential}
          />
        </Modal>
      )}
    </div>
  );
}
