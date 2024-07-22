"use client";

import { Credential, ValidSources } from "@/lib/types";
import { FaSwatchbook } from "react-icons/fa";
import { NewChatIcon } from "@/components/icons/icons";
import { useState } from "react";
import { deleteCredential, swapCredential } from "@/lib/credential";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Text } from "@tremor/react";
import { getSourceDisplayName } from "@/lib/sources";
import { Modal } from "@/components/Modal";
import ModifyCredential from "@/components/credentials/ModifyCredential";
import CreateCredential from "@/components/credentials/CreateCredential";
import EditCredential from "@/components/credentials/EditCredential";

export default function CreateConnectorCredentialSection({
  sourceType,
  credentials,
  refresh,
  updateCredential,
  currentCredential,
}: {
  credentials: Credential<any>[];
  refresh: () => void;
  currentCredential: Credential<any> | null;
  updateCredential: (credential: Credential<any>) => void;
  sourceType: ValidSources;
}) {
  const makeShowCreateCredential = () => {
    setShowModifyCredential(false);
    setShowCreateCredential(true);
  };

  const onSwap = async (selectedCredential: Credential<any>) => {
    updateCredential(selectedCredential);
    setPopup({
      message: "Swapped credential succesfully!",
      type: "success",
    });
    setShowModifyCredential(false);
    refresh();
  };

  const onUpdateCredential = async (
    selectedCredential: Credential<any | null>,
    details: any,
    onSucces: () => void
  ) => {
    const response = await swapCredential(selectedCredential.id, details);
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

  if (!credentials) {
    return <></>;
  }

  return (
    <div className="flex justify-start flex-col gap-y-2">
      {popup}

      <div className="flex gap-x-2">
        {currentCredential ? (
          <>
            <p>Current credential:</p>
            <Text className="ml-1 italic font-bold my-auto">
              {currentCredential.name || `Credential #${currentCredential.id}`}
            </Text>
          </>
        ) : (
          <p>No Credential selected!</p>
        )}
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
          className="max-w-3xl rounded-lg"
          title="Modify Credential"
        >
          <ModifyCredential
            display
            source={sourceType}
            defaultedCredential={currentCredential!}
            credentials={credentials}
            setPopup={setPopup}
            onDeleteCredential={onDeleteCredential}
            onEditCredential={(credential: Credential<any>) =>
              onEditCredential(credential)
            }
            onSwitch={onSwap}
            onCreateNew={() => makeShowCreateCredential()}
            onClose={() => closeModifyCredential()}
          />
        </Modal>
      )}

      {editingCredential && (
        <Modal
          onOutsideClick={closeEditingCredential}
          className="max-w-3xl rounded-lg"
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
          className="max-w-3xl rounded-lg"
          title={`Create ${getSourceDisplayName(sourceType)} Credential`}
        >
          <CreateCredential
            sourceType={sourceType}
            setPopup={setPopup}
            onSwap={onSwap}
            onClose={closeCreateCredential}
          />
        </Modal>
      )}
    </div>
  );
}
