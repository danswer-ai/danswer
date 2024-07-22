import * as Yup from "yup";
import React, { useState } from "react";
import { Modal } from "@/components/Modal";
import { Button, Text, Card } from "@tremor/react";
import { Credential, getDisplayNameForCredentialKey } from "@/lib/types";
import { FaNewspaper } from "react-icons/fa";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik, FormikHelpers } from "formik";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { EditIcon } from "@/components/icons/icons";
import { EditingValue } from "./EditingValue";

interface JsonValues {
  [key: string]: string;
}

interface FormValues extends JsonValues {
  name: string;
}

interface EditCredentialProps {
  credential: Credential<JsonValues>;
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onUpdate: (
    selectedCredentialId: Credential<any>,
    details: any,
    onSuccess: () => void
  ) => Promise<void>;
}

function createValidationSchema(json_values: JsonValues) {
  const schemaFields: { [key: string]: Yup.StringSchema } = {};

  for (const key in json_values) {
    if (Object.prototype.hasOwnProperty.call(json_values, key)) {
      schemaFields[key] = Yup.string().optional();
    }
  }

  schemaFields["name"] = Yup.string().optional();

  return Yup.object().shape(schemaFields);
}

function createInitialValues(credential: Credential<JsonValues>): FormValues {
  const initialValues: FormValues = {
    name: credential.name || "",
    ...credential.credential_json,
  };
  return initialValues;
}

const EditCredential: React.FC<EditCredentialProps> = ({
  credential,
  onClose,
  setPopup,
  onUpdate,
}) => {
  const validationSchema = createValidationSchema(credential.credential_json);
  const initialValues = createInitialValues(credential);

  const handleSubmit = async (
    values: FormValues,
    formikHelpers: FormikHelpers<FormValues>
  ) => {
    formikHelpers.setSubmitting(true);
    try {
      await onUpdate(credential, values, onClose);
    } catch (error) {
      console.error("Error updating credential:", error);
      setPopup({ message: "Error updating credential", type: "error" });
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  return (
    <div className="mb-4">
      <Text>
        Ensure that you update to a credential with the proper permissions!
      </Text>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, setFieldValue }) => (
          <Form>
            <Card className="mt-4 flex flex-col gap-y-4">
              <TextFormField
                onChange={(e) => setFieldValue("name", e.target.value)}
                noPadding
                name="name"
                placeholder={credential.name || ""}
                label="Name (optional):"
              />

              {Object.entries(credential.credential_json).map(
                ([key, value]) => (
                  <EditingValue
                    includRevert
                    key={key}
                    setFieldValue={setFieldValue}
                    name={key}
                    currentValue={value}
                    label={getDisplayNameForCredentialKey(key)}
                    type={
                      key.toLowerCase().includes("token") ||
                      key.toLowerCase().includes("password")
                        ? "password"
                        : "text"
                    }
                  />
                )
              )}
            </Card>
            <div className="flex mt-8 justify-end">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-indigo-500 hover:bg-indigo-400"
              >
                <div className="flex gap-x-2 items-center w-full border-none">
                  <FaNewspaper />
                  <p>Update</p>
                </div>
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default EditCredential;
