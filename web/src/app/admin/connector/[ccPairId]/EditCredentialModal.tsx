import * as Yup from "yup";
import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Badge, Card } from "@tremor/react";
import { ConfluenceCredentialJson, Credential } from "@/lib/types";
import { FaNewspaper, FaSwatchbook } from "react-icons/fa";

import { submitCredential } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik } from "formik";
import Popup from "@/components/popup/Popup";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
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
  setFieldValue,
  label,
  type,
}: {
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean
  ) => Promise<any>;
  name: string;
  currentValue: string;
  label: string;
  type?: string;
}) => {
  const [value, setValue] = useState("");
  const updateValue = (newValue: string) => {
    setValue(newValue);
    setFieldValue(name, newValue);
  };

  return (
    <div className="w-full flex gap-x-2 justify-between">
      <div className="w-full">
        <TextFormField
          noPadding
          onChange={(e) => updateValue(e.target.value)}
          value={value}
          type={type}
          name={name}
          placeholder={currentValue}
          label={label}
        />
      </div>
      <div className="flex-none mt-auto">
        <button
          className="text-xs h-[35px] my-auto p-1.5 rounded bg-neutral-900 border-neutral-700 text-neutral-300 flex gap-x-1"
          onClick={(e) => {
            updateValue("");
            e.preventDefault();
          }}
        >
          <EditIcon className="text-netural-300 my-auto" />
          <p className="my-auto">Revert</p>
        </button>
      </div>
    </div>
  );
};
export default function EditCredentialModal({
  credential,
  onClose,
  setPopup,
  onUpdate,
}: {
  onUpdate: (
    selectedCredentialId: Credential<any | null>,
    details: any,
    onSuccess: () => void
  ) => Promise<void>;
  setPopup: (popupSpec: PopupSpec | null) => void;
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

  return (
    <Modal
      onOutsideClick={onClose}
      className="max-w-2xl rounded-lg"
      title={`Edit Credential`}
    >
      <div className="mb-4">
        <Text>
          Ensure that you update to a credential with the proper permissions!
          You can click{" "}
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
            confluence_username: Yup.string().optional(),
            confluence_access_token: Yup.string().optional(),
            name: Yup.string().optional(),
          })}
          onSubmit={async (values, formikHelpers) => {
            formikHelpers.setSubmitting(true);
            await onUpdate(credential, values, onClose);
            formikHelpers.setSubmitting(false);
          }}
        >
          {({ isSubmitting, setFieldValue }) => (
            <Form>
              <>
                <Card className="mt-4 flex flex-col gap-y-4">
                  <TextFormField
                    onChange={(e) => setFieldValue("name", e.target.value)}
                    noPadding
                    name="name"
                    placeholder={credential.name || ""}
                    label="Name (optional):"
                  />

                  <EditingValue
                    setFieldValue={setFieldValue}
                    name="confluence_username"
                    currentValue={
                      credential.credential_json.confluence_username
                    }
                    label="Username:"
                  />
                  <EditingValue
                    setFieldValue={setFieldValue}
                    type="password"
                    name="confluence_access_token"
                    currentValue={
                      credential.credential_json.confluence_access_token
                    }
                    label="Access token:"
                  />
                </Card>
                <div className="flex mt-8 justify-end">
                  <Button className="bg-indigo-500 hover:bg-indigo-400">
                    <div className="flex gap-x-2 items-center w-full border-none">
                      <FaNewspaper />
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
