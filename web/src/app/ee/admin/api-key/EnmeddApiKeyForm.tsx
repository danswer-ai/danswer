import { Form, Formik } from "formik";
import { TextFormField } from "@/components/admin/connectors/Field";
import { createApiKey, updateApiKey } from "./lib";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ApiKeyFormProps {
  onClose: () => void;
  onCreateApiKey: (apiKey: APIKey) => void;
  apiKey?: APIKey;
}

export const EnmeddApiKeyForm = ({
  onClose,
  onCreateApiKey,
  apiKey,
}: ApiKeyFormProps) => {
  const isUpdate = apiKey !== undefined;
  const { toast } = useToast();

  return (
    <div>
      {/*  <h2 className="text-xl font-bold flex pb-6">
        {isUpdate ? "Update API Key" : "Create a new API Key"}
      </h2> */}

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
            toast({
              title: "Success",
              description: isUpdate
                ? "Successfully updated API key!"
                : "Successfully created API key!",
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
              title: "Error",
              description: isUpdate
                ? `Error updating API key - ${errorMsg}`
                : `Error creating API key - ${errorMsg}`,
              variant: "destructive",
            });
          }
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <p className="mb-4">
              Choose a memorable name for your API key. This is optional and can
              be added or changed later!
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
  );
};
