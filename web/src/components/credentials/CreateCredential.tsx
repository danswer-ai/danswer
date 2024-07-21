import * as Yup from "yup";
import React from "react";
import { Button, Card } from "@tremor/react";
import {
  Connector,
  Credential,
  getCredentialTemplate,
  getDisplayNameForCredentialKey,
  ValidSources,
} from "@/lib/types";
import { FaAccusoft, FaSwatchbook } from "react-icons/fa";

import { submitCredential } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik, FormikHelpers } from "formik";

import { PopupSpec } from "@/components/admin/connectors/Popup";
import { getSourceDocLink } from "@/lib/sources";

type ActionType = "create" | "createAndSwap";

export default function CreateCredential({
  onClose,
  connector,

  onSwap,
  setPopup,
  sourceType,
}: {
  sourceType: ValidSources;
  connector?: Connector<any>;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onClose: () => void;
  onSwap: (selectedCredentialId: number, connectorId: number) => Promise<void>;
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

      const { message, isSuccess, credentialId } = response;

      if (!credentialId) {
        throw new Error("No credential ID returned");
      }

      if (isSuccess && connector) {
        onClose();
        if (action === "createAndSwap") {
          const swap = await onSwap(credentialId, connector.id);
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

  const types = getCredentialTemplate(sourceType);

  const input_values = Object.keys(types);

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

    // Add the optional 'name' field
    schemaFields["name"] = Yup.string().optional();

    return Yup.object().shape(schemaFields);
  }

  function createInitialValues(json_values: JsonValues): FormValues {
    const initialValues: FormValues = { name: "" };
    for (const key in json_values) {
      if (Object.prototype.hasOwnProperty.call(json_values, key)) {
        initialValues[key] = "";
      }
    }
    return initialValues;
  }

  const validationSchema = createValidationSchema(json_values);

  console.log(input_values);
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
          <p>
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
          <Card className="mt-4">
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
          </Card>
          <div className="flex gap-x-4 mt-8 justify-end">
            {connector && (
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
            )}
            <Button
              className="bg-indigo-500 hover:bg-indigo-400"
              onClick={() =>
                handleSubmit(formikProps.values, formikProps, "create")
              }
              type="button"
              disabled={formikProps.isSubmitting}
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
  );
}
