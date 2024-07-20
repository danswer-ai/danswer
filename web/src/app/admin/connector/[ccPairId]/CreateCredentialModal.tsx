import * as Yup from "yup";
import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Badge, Card } from "@tremor/react";
import { ConfluenceCredentialJson, Credential } from "@/lib/types";
import { FaAccusoft, FaSwatchbook } from "react-icons/fa";

import { submitCredential } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik, FormikHelpers } from "formik";
import Popup from "@/components/popup/Popup";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { linkCredential } from "@/lib/credential";
import { ModalWrapper } from "@/app/chat/modal/ModalWrapper";
interface CredentialSelectionTableProps {
  credentials: Credential<any>[];
  onSelectCredential: (credential: Credential<any> | null) => void;
}

interface FormValues {
  confluence_username: string;
  confluence_access_token: string;
  name: string;
}

type ActionType = "create" | "createAndSwap";

export default function CreateCredentialModal({
  connectorId,
  id,
  onClose,
  onSwap,
  onCreateNew,
  setPopup,
}: {
  setPopup: (popupSpec: PopupSpec | null) => void;
  connectorId: number;
  id: number;
  onClose: () => void;
  onSwap: (selectedCredentialId: number, connectorId: number) => Promise<void>;
  onCreateNew: () => void;
}) {
  const handleSubmit = async (
    values: FormValues,
    formikHelpers: Pick<FormikHelpers<FormValues>, "setSubmitting">,
    action: ActionType
  ) => {
    formikHelpers.setSubmitting(true);
    const { confluence_username, confluence_access_token, name } = values;

    try {
      const response = await submitCredential({
        credential_json: { confluence_username, confluence_access_token },
        admin_public: true,
        name: name,
        source: "confluence",
      });

      const { message, isSuccess, credentialId } = response;

      if (!credentialId) {
        throw new Error("No credential ID returned");
      }

      if (isSuccess) {
        onClose();
        if (action === "createAndSwap") {
          const swap = await onSwap(credentialId, connectorId);
        } else {
          setPopup({ type: "success", message: "Created new credneital!!" });
          setTimeout(() => setPopup(null), 4000);
        }
      } else {
        setPopup({ message, type: "error" });
      }
    } catch (error) {
      console.error("Error submitting credential:", error);
      setPopup({ message: "Error submitting credential", type: "error" });
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  return (
    <Modal
      onOutsideClick={onClose}
      className="max-w-2xl rounded-lg"
      title={`Create Credential`}
    >
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
          name: Yup.string().optional(),
        })}
        onSubmit={(values, formikHelpers) => {}} // This will be overridden by our custom submit handlers
      >
        {({ isSubmitting, submitForm, setSubmitting, values }) => (
          <Form>
            <Card className="mt-4">
              <TextFormField
                name="name"
                placeholder="(Optional) credential name.."
                label="Name:"
              />
              <TextFormField
                name="confluence_username"
                placeholder="Confluence username"
                label="Username:"
              />
              <TextFormField
                placeholder="Confluence access token"
                name="confluence_access_token"
                label="Access Token:"
                type="password"
              />
            </Card>
            <div className="flex gap-x-4 mt-8 justify-end">
              <Button
                className="bg-rose-500 hover:bg-rose-400 border-rose-800"
                onClick={() =>
                  handleSubmit(values, { setSubmitting }, "createAndSwap")
                }
                type="button"
                disabled={isSubmitting}
              >
                <div className="flex gap-x-2 items-center w-full border-none">
                  <FaAccusoft />
                  <p>Create + Swap</p>
                </div>
              </Button>
              <Button
                className="bg-indigo-500 hover:bg-indigo-400"
                onClick={() =>
                  handleSubmit(values, { setSubmitting }, "create")
                }
                type="button"
                disabled={isSubmitting}
              >
                <div className="flex gap-x-2 items-center w-full border-none">
                  <FaSwatchbook />
                  <p>Create</p>
                </div>
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </Modal>
  );
}
