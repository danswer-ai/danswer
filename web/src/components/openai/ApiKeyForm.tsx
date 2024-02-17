import { Form, Formik } from "formik";
import { Popup } from "../admin/connectors/Popup";
import { useState } from "react";
import { TextFormField } from "../admin/connectors/Field";
import { GEN_AI_API_KEY_URL } from "./constants";
import { LoadingAnimation } from "../Loading";
import { Button } from "@tremor/react";

interface Props {
  handleResponse?: (response: Response) => void;
}

export const ApiKeyForm = ({ handleResponse }: Props) => {
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  return (
    <div>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <Formik
        initialValues={{ apiKey: "" }}
        onSubmit={async ({ apiKey }, formikHelpers) => {
          const response = await fetch(GEN_AI_API_KEY_URL, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ api_key: apiKey }),
          });
          if (handleResponse) {
            handleResponse(response);
          }
          if (response.ok) {
            setPopup({
              message: "Updated API key!",
              type: "success",
            });
            formikHelpers.resetForm();
          } else {
            const body = await response.json();
            if (body.detail) {
              setPopup({ message: body.detail, type: "error" });
            } else {
              setPopup({
                message:
                  "Unable to set API key. Check if the provided key is valid.",
                type: "error",
              });
            }
            setTimeout(() => {
              setPopup(null);
            }, 10000);
          }
        }}
      >
        {({ isSubmitting }) =>
          isSubmitting ? (
            <div className="text-base">
              <LoadingAnimation text="Validating API key" />
            </div>
          ) : (
            <Form>
              <TextFormField name="apiKey" type="password" label="API Key:" />
              <div className="flex">
                <Button
                  size="xs"
                  type="submit"
                  disabled={isSubmitting}
                  className="w-48 mx-auto"
                >
                  Submit
                </Button>
              </div>
            </Form>
          )
        }
      </Formik>
    </div>
  );
};
