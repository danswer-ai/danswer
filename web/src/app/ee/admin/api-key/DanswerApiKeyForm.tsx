import { Form, Formik } from "formik";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { TextFormField } from "@/components/admin/connectors/Field";
import { createApiKey, updateApiKey } from "./lib";
import { Modal } from "@/components/Modal";
import { Button } from "@/components/ui/button";

interface DanswerApiKeyFormProps {
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  onCreateApiKey: (apiKey: APIKey) => void;
  apiKey?: APIKey;
}

export const DanswerApiKeyForm = ({
  onClose,
  setPopup,
  onCreateApiKey,
  apiKey,
}: DanswerApiKeyFormProps) => {
  const isUpdate = apiKey !== undefined;

  return (
    <Modal onOutsideClick={onClose} width="w-2/6">
      <div className="px-8 py-6 bg-background">
        <h2 className="text-xl font-bold flex pb-6">
          {isUpdate ? "Update API Key" : "Create a new API Key"}
        </h2>

        <Formik
          initialValues={{
            name: apiKey?.api_key_name || "",
          }}
          onSubmit={async (values, formikHelpers) => {
            formikHelpers.setSubmitting(true);
            let response;
            if (isUpdate) {
              response = await updateApiKey(apiKey.api_key_id, values);
            } else {
              response = await createApiKey(values);
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
              <p className="mb-4 text-lg">
                Choose a memorable name for your API key. This is optional and
                can be added or changed later!
              </p>

              <TextFormField
                name="name"
                label="Name (optional):"
                autoCompleteDisabled={true}
              />

              <div className="flex">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="mx-auto w-64"
                >
                  {isUpdate ? "Update!" : "Create!"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </div>
    </Modal>
  );
};
