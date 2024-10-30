import React from "react";
import { Button, Text, Card } from "@tremor/react";

import { FaNewspaper, FaPaperPlane, FaTractor, FaTrash } from "react-icons/fa";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik, FormikHelpers } from "formik";
import {
  Credential,
  getDisplayNameForCredentialKey,
} from "@/lib/connectors/credentials";
import { createEditingValidationSchema, createInitialValues } from "../lib";
import { dictionaryType, formType } from "../types";
import { useToast } from "@/hooks/use-toast";

const EditCredential = ({
  credential,
  onClose,
  onUpdate,
}: {
  credential: Credential<dictionaryType>;
  onClose: () => void;
  onUpdate: (
    selectedCredentialId: Credential<any>,
    details: any,
    onSuccess: () => void
  ) => Promise<void>;
}) => {
  const { toast } = useToast()
  const validationSchema = createEditingValidationSchema(
    credential.credential_json
  );
  const initialValues = createInitialValues(credential);

  const handleSubmit = async (
    values: formType,
    formikHelpers: FormikHelpers<formType>
  ) => {
    formikHelpers.setSubmitting(true);
    try {
      await onUpdate(credential, values, onClose);
    } catch (error) {
      console.error("Error updating credential:", error);
      toast({
        title: "Update Failed",
        description: "Error updating credential. Please try again.",
        variant: "destructive",
      });
    } finally {
      formikHelpers.setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col gap-y-6">
      <Text>
        Ensure that you update to a credential with the proper permissions!
      </Text>

      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={handleSubmit}
      >
        {({ isSubmitting, resetForm }) => (
          <Form>
            <TextFormField
              name="name"
              placeholder={credential.name || ""}
              label="Name (optional):"
              optional
            />

            {Object.entries(credential.credential_json).map(([key, value]) => (
              <TextFormField
                key={key}
                name={key}
                placeholder={value}
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
              <Button type="button" onClick={() => resetForm()}>
                <div className="flex gap-x-2 items-center w-full border-none">
                  <FaTrash />
                  <p>Reset Changes</p>
                </div>
              </Button>
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
