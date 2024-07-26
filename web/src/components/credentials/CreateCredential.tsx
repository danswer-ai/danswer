import * as Yup from "yup";
import React from "react";
import { Button, Card } from "@tremor/react";
import { ValidSources } from "@/lib/types";
import { FaAccusoft, FaSwatchbook } from "react-icons/fa";

import { submitCredential } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik, FormikHelpers } from "formik";

import { PopupSpec } from "@/components/admin/connectors/Popup";
import { getSourceDocLink } from "@/lib/sources";
import GDriveMain from "@/app/admin/connectors/[connector]/pages/gdrive/GoogleDrivePage";

import { Connector } from "@/lib/connectors/connectors";
import {
  Credential,
  credentialTemplates,
  getDisplayNameForCredentialKey,
} from "@/lib/connectors/credentials";
import { PlusCircleIcon } from "../icons/icons";
import { GmailMain } from "@/app/admin/connectors/[connector]/pages/gmail/GmailPage";

type ActionType = "create" | "createAndSwap";

export default function CreateCredential({
  onClose = () => null,
  connector,
  onSwap = async () => null,
  setPopup,
  sourceType,
  hideConnector,
  refresh = () => null,
  hideSource,
  onSwitch,
  // onSwitch= () => null,
  close,
}: {
  hideConnector?: () => void;
  onSwitch?: (selectedCredential: Credential<any>) => Promise<void>;
  refresh?: () => void;
  hideSource?: boolean;
  close?: boolean;
  sourceType: ValidSources;
  connector?: Connector<any>;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onClose?: () => void;
  onSwap?: (selectedCredential: Credential<any>, connectorId: number) => void;
}) {
  const handleSubmit = async (
    values: JsonValues & { name?: string },
    formikHelpers: FormikHelpers<FormValues>,
    action: ActionType
  ) => {
    const { setSubmitting, validateForm } = formikHelpers;

    // Validate the form
    const errors = await validateForm(values);

    if (Object.keys(errors).length > 0) {
      // If there are validation errors, set them and return
      formikHelpers.setErrors(errors);
      return;
    }

    setSubmitting(true);

    // Validate the form

    if (Object.keys(errors).length > 0) {
      // If there are validation errors, set them and return
      formikHelpers.setErrors(errors);
      return;
    }
    formikHelpers.setSubmitting(true);
    const { name, ...credentialValues } = values;

    try {
      const response = await submitCredential({
        credential_json: credentialValues,
        admin_public: true,
        name: name,
        source: sourceType,
      });

      const { message, isSuccess, credential } = response;

      if (!credential) {
        throw new Error("No credential returned");
      }

      if (isSuccess && connector) {
        if (action === "createAndSwap") {
          onSwap(credential, connector.id);
        } else {
          setPopup({ type: "success", message: "Created new credneital!!" });
          setTimeout(() => setPopup(null), 4000);
        }
        onClose();
      } else {
        setPopup({ message, type: isSuccess ? "success" : "error" });
      }
      if (close) {
        onClose();
      }
      await refresh();

      if (onSwitch) {
        onSwitch(response?.credential!);
      }
    } catch (error) {
      console.error("Error submitting credential:", error);
      setPopup({ message: "Error submitting credential", type: "error" });
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  const types = credentialTemplates[sourceType];

  interface JsonValues {
    [key: string]: string;
  }
  interface FormValues extends JsonValues {
    name: string;
  }

  const json_values: JsonValues = types;

  function createValidationSchema(json_values: JsonValues) {
    const schemaFields: { [key: string]: Yup.StringSchema } = {};

    for (const key in json_values) {
      if (Object.prototype.hasOwnProperty.call(json_values, key)) {
        schemaFields[key] = Yup.string().required(
          `Please enter your ${getDisplayNameForCredentialKey(key)}`
        );
      }
    }

    schemaFields["name"] = Yup.string().optional();
    return Yup.object().shape(schemaFields);
  }
  if (sourceType == "gmail") {
    return <GmailMain />;
  }

  if (sourceType == "google_drive") {
    return <GDriveMain />;
  }
  const validationSchema = createValidationSchema(json_values);

  return (
    <Formik
      initialValues={{
        name: "",
      }}
      validationSchema={validationSchema}
      onSubmit={(values, formikHelpers) => {}} // This will be overridden by our custom submit handlers
    >
      {(formikProps) => (
        <Form>
          {!hideSource && (
            <p className="text-sm">
              Check our
              <a
                className="text-blue-600 hover:underline"
                target="_blank"
                href={getSourceDocLink(sourceType) || ""}
              >
                {" "}
                docs{" "}
              </a>
              for information on setting up this connector.
            </p>
          )}
          <Card className="!border-0 mt-4">
            <TextFormField
              name="name"
              placeholder="(Optional) credential name.."
              label="Name:"
            />
            {Object.entries(json_values).map(([key, val]) => (
              <TextFormField
                key={key}
                name={key}
                placeholder={val}
                label={getDisplayNameForCredentialKey(key)}
                type={
                  key.toLowerCase().includes("token") ||
                  key.toLowerCase().includes("password")
                    ? "password"
                    : "text"
                }
              />
            ))}
            <div className="flex justify-between w-full">
              {hideConnector && (
                <Button size="xs" onClick={hideConnector} color="slate">
                  Hide
                </Button>
              )}
              <Button
                className="bg-indigo-500 hover:bg-indigo-400"
                onClick={() =>
                  handleSubmit(formikProps.values, formikProps, "create")
                }
                type="button"
                disabled={formikProps.isSubmitting}
              >
                <div className="flex items-center gap-x-1">
                  <PlusCircleIcon size={16} className="text-indigo-100" />
                  Create
                </div>
              </Button>
            </div>
          </Card>
          {connector && (
            <div className="flex gap-x-4 w-full mt-8 justify-end">
              <Button
                className="bg-rose-500 hover:bg-rose-400 border-rose-800"
                onClick={() =>
                  handleSubmit(formikProps.values, formikProps, "createAndSwap")
                }
                type="button"
                disabled={formikProps.isSubmitting}
              >
                <div className="flex gap-x-2 items-center w-full border-none">
                  <FaAccusoft />
                  <p>Create + Swap</p>
                </div>
              </Button>
            </div>
          )}
        </Form>
      )}
    </Formik>
  );
}
