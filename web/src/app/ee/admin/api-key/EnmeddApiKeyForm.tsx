import { Form, Formik } from "formik";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { createApiKey, updateApiKey } from "./lib";
import { Modal } from "@/components/Modal";
import { Button, Divider, Text } from "@tremor/react";
import { UserRole } from "@/lib/types";
import { APIKey } from "./types";

interface EnmeddApiKeyFormProps {
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onCreateApiKey: (apiKey: APIKey) => void;
  apiKey?: APIKey;
}

export const EnmeddApiKeyForm = ({
  onClose,
  setPopup,
  onCreateApiKey,
  apiKey,
}: EnmeddApiKeyFormProps) => {
  const isUpdate = apiKey !== undefined;

  return (
    <Modal onOutsideClick={onClose} width="w-2/6">
      <>
        <h2 className="text-xl font-bold flex">
          {isUpdate ? "Update API Key" : "Create a new API Key"}
        </h2>

        <Divider />

        <Formik
          initialValues={{
            name: apiKey?.api_key_name || "",
            is_admin: apiKey?.api_key_role === "admin",
          }}
          onSubmit={async (values, formikHelpers) => {
            formikHelpers.setSubmitting(true);

            // Map the boolean to a UserRole string
            const role: UserRole = values.is_admin
              ? UserRole.ADMIN
              : UserRole.BASIC;

            // Prepare the payload with the UserRole
            const payload = {
              ...values,
              role, // Assign the role directly as a UserRole type
            };

            let response;
            if (isUpdate) {
              response = await updateApiKey(apiKey.api_key_id, payload);
            } else {
              response = await createApiKey(payload);
            }
            formikHelpers.setSubmitting(false);
            if (response.ok) {
              setPopup({
                message: isUpdate
                  ? "Successfully updated API key!"
                  : "Successfully created API key!",
                type: "success",
              });
              if (!isUpdate) {
                onCreateApiKey(await response.json());
              }
              onClose();
            } else {
              const responseJson = await response.json();
              const errorMsg = responseJson.detail || responseJson.message;
              setPopup({
                message: isUpdate
                  ? `Error updating API key - ${errorMsg}`
                  : `Error creating API key - ${errorMsg}`,
                type: "error",
              });
            }
          }}
        >
          {({ isSubmitting, values, setFieldValue }) => (
            <Form>
              <Text className="mb-4 text-lg">
                Choose a memorable name for your API key. This is optional and
                can be added or changed later!
              </Text>

              <TextFormField
                name="name"
                label="Name (optional):"
                autoCompleteDisabled={true}
              />

              <BooleanFormField
                alignTop
                name="is_admin"
                label="Is Admin?"
                subtext="If set, this API key will have access to admin level server API's."
              />

              <Button
                type="submit"
                size="xs"
                color="green"
                disabled={isSubmitting}
              >
                {isUpdate ? "Update!" : "Create!"}
              </Button>
            </Form>
          )}
        </Formik>
      </>
    </Modal>
  );
};