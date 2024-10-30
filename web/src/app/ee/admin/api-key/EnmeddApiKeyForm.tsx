import { Form, Formik } from "formik";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { createApiKey, updateApiKey } from "./lib";
import { Modal } from "@/components/Modal";
import { UserRole } from "@/lib/types";
import { APIKey } from "./types";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface EnmeddApiKeyFormProps {
  onClose: () => void;
  onCreateApiKey: (apiKey: APIKey) => void;
  apiKey?: APIKey;
}

export const EnmeddApiKeyForm = ({
  onClose,
  onCreateApiKey,
  apiKey,
}: EnmeddApiKeyFormProps) => {
  const isUpdate = apiKey !== undefined;
  const { toast } = useToast();

  return (
    <div>
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
            toast({
              title: "API Key Operation Successful",
              description: isUpdate
                ? "API key updated successfully!"
                : "API key created successfully!",
              variant: "success",
            });
            if (!isUpdate) {
              onCreateApiKey(await response.json());
            }
            onClose();
          } else {
            const responseJson = await response.json();
            const errorMsg = responseJson.detail || responseJson.message;
            toast({
              title: "API Key Operation Failed",
              description: isUpdate
                ? `Error updating API key: ${errorMsg}`
                : `Error creating API key: ${errorMsg}`,
              variant: "destructive",
            });
          }
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <p>
              Choose a memorable name for your API key. This is optional and can
              be added or changed later
            </p>

            <TextFormField
              name="name"
              label="Name (optional):"
              autoCompleteDisabled={true}
              optional
            />

            <BooleanFormField
              alignTop
              name="is_admin"
              label="Is Admin?"
              subtext="If set, this API key will have access to admin level server API's."
            />

            <Button type="submit" disabled={isSubmitting}>
              {isUpdate ? "Update" : "Create"}
            </Button>
          </Form>
        )}
      </Formik>
    </div>
  );
};
