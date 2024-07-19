import * as Yup from "yup";
import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Badge, Card } from "@tremor/react";
import { ConfluenceCredentialJson, Credential } from "@/lib/types";
import { FaSwatchbook } from "react-icons/fa";

import { submitCredential } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik } from "formik";
import Popup from "@/components/popup/Popup";
import { usePopup } from "@/components/admin/connectors/Popup";
import { linkCredential } from "@/lib/credential";
import { EditIcon } from "@/components/icons/icons";
interface CredentialSelectionTableProps {
  credentials: Credential<any>[];
  onSelectCredential: (credential: Credential<any> | null) => void;
}

const CredentialSelectionTable: React.FC<CredentialSelectionTableProps> = ({
  credentials,
  onSelectCredential,
}) => {
  const [selectedCredentialId, setSelectedCredentialId] = useState<
    number | null
  >(null);

  const handleSelectCredential = (credentialId: number) => {
    const newSelectedId =
      selectedCredentialId === credentialId ? null : credentialId;
    setSelectedCredentialId(newSelectedId);
    const selectedCredential =
      credentials.find((cred) => cred.id === newSelectedId) || null;
    onSelectCredential(selectedCredential);
  };

  return (
    <div className="w-full overflow-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 text-left font-medium text-gray-600"></th>
            <th className="p-2 text-left font-medium text-gray-600">ID</th>
            <th className="p-2 text-left font-medium text-gray-600">Name</th>
            <th className="p-2 text-left font-medium text-gray-600">Created</th>
            <th className="p-2 text-left font-medium text-gray-600">Updated</th>
          </tr>
        </thead>
        <tbody>
          {credentials.map((credential, ind) => (
            <tr key={credential.id} className="border-b hover:bg-gray-50">
              <td className="p-2">
                {ind != 0 ? (
                  <input
                    type="radio"
                    name="credentialSelection"
                    checked={selectedCredentialId === credential.id}
                    onChange={() => handleSelectCredential(credential.id)}
                    className="form-radio h-4 w-4 text-blue-600 transition duration-150 ease-in-out"
                  />
                ) : (
                  <Badge>current</Badge>
                )}
              </td>
              <td className="p-2">{credential.id}</td>
              <td className="p-2">{credential.admin_public ? "Yes" : "No"}</td>
              <td className="p-2">
                {new Date(credential.time_created).toLocaleString()}
              </td>
              <td className="p-2">
                {new Date(credential.time_updated).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EditingValue = ({
  name,
  currentValue,
  label,
  type,
}: {
  name: string;
  currentValue: string;
  label: string;
  type?: string;
}) => {
  const [editing, setEditing] = useState(false);
  return (
    <div className="my-6 w-full">
      {editing ? (
        <div className="w-full flex gap-x-2 justify-between">
          <div className="w-full">
            <TextFormField
              noPadding
              type={type}
              name={name}
              placeholder={currentValue}
              label={label}
            />
          </div>
          <div className="flex-none mt-auto">
            <button
              className="text-xs h-[35px] my-auto p-1.5 rounded bg-neutral-900 border-neutral-700 text-neutral-300 flex gap-x-1"
              onClick={() => setEditing((editing) => !editing)}
            >
              <EditIcon className="text-netural-300 my-auto" />
              <p className="my-auto">Revert</p>
            </button>
          </div>

          {/* <button
            className="-mt-4 mb-2 p-1.5 rounded bg-neutral-900 border-neutral-700 text-neutral-300 flex gap-x-1"
            onClick={() => setEditing(editing => !editing)}>
            <EditIcon className="text-netural-300 my-auto" />
            Revert
          </button> */}
        </div>
      ) : (
        <div className="flex text-base gap-x-4">
          Your current {label}: {currentValue}
          <button
            className="text-xs my-auto p-1.5 rounded bg-neutral-900 border-neutral-700 text-neutral-300 flex gap-x-1"
            onClick={() => setEditing((editing) => !editing)}
          >
            <EditIcon className="text-netural-300 my-auto" />
            Edit
          </button>
        </div>
      )}
    </div>
  );
};
export default function EditCredentialModal({
  credential,
  onClose,
}: {
  credential: Credential<ConfluenceCredentialJson>;
  onClose: () => void;
}) {
  const [selectedCredential, setSelectedCredential] =
    React.useState<Credential<any> | null>(null);

  const handleSelectCredential = (credential: Credential<any> | null) => {
    setSelectedCredential(credential);
    console.log("Selected credential:", credential);
  };

  const [confluenceCredential, setConfluenceCredential] =
    useState<Credential<ConfluenceCredentialJson> | null>(null);

  const { popup, setPopup } = usePopup();

  return (
    <Modal
      onOutsideClick={onClose}
      className="max-w-2xl rounded-lg"
      title={`Edit Credential`}
    >
      <div className="mb-4">
        <Text>
          To use the Confluence connector, first follow the guide{" "}
          <a
            className="text-link"
            href="https://docs.danswer.dev/connectors/confluence#setting-up"
            target="_blank"
          >
            here
          </a>{" "}
          to generate an Access Token.
        </Text>

        {/* {popup && <Popup message={popup.message} type={popup.type} />} */}
        <Formik
          initialValues={{
            confluence_username: "",
            confluence_access_token: "",
            name: "",
          }}
          validationSchema={Yup.object().shape({
            confluence_username: Yup.string().required(
              "Please enter your username on Confluence"
            ),
            confluence_access_token: Yup.string().required(
              "Please enter your Confluence access token"
            ),
            names: Yup.string().optional(),
          })}
          onSubmit={(values, formikHelpers) => {
            formikHelpers.setSubmitting(true);
            const { confluence_username, confluence_access_token, name } =
              values;
            submitCredential<ConfluenceCredentialJson>({
              credential_json: { confluence_username, confluence_access_token },
              admin_public: true,
              name: name,
              source: "confluence",
            }).then(async (response) => {
              console.log(response);
              const { message, isSuccess, credentialId } = response;
              if (!credentialId) {
                return;
              }
              console.log("link");

              setPopup({ message, type: isSuccess ? "success" : "error" });
              setTimeout(() => {
                setPopup(null);
              }, 4000);
              console.log(message);
              if (isSuccess) {
                onClose();
              }

              formikHelpers.setSubmitting(false);
              // setTimeout(() => {
              //   setPopup(null);
              // }, 4000);
              // onSubmit(isSuccess);
            });
            // const credenai
            // onSwap(values)
          }}
        >
          {({ isSubmitting }) => (
            <Form>
              <>
                <Card className="mt-4">
                  <TextFormField
                    name="name"
                    placeholder={credential.name || ""}
                    label="Name:"
                  />

                  <EditingValue
                    name="confluence_username"
                    currentValue={
                      credential.credential_json.confluence_username
                    }
                    label="Username:"
                  />
                  <EditingValue
                    name="confluence_access_token"
                    currentValue={
                      credential.credential_json.confluence_access_token
                    }
                    label="Access Token:"
                    type="password"
                  />
                </Card>
                <div className="flex mt-8 justify-end">
                  <Button className="bg-indigo-500 hover:bg-indigo-400">
                    <div className="flex gap-x-2 items-center w-full border-none">
                      <FaSwatchbook />
                      <p>Update</p>
                    </div>
                  </Button>
                </div>
              </>
            </Form>
          )}
        </Formik>
      </div>
    </Modal>
  );
}
