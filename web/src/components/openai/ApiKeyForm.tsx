import { Form, Formik } from "formik";
import { Popup } from "../admin/connectors/Popup";
import { useState } from "react";
import { TextFormField } from "../admin/connectors/Field";
import { GEN_AI_API_KEY_URL } from "./constants";
import { LoadingAnimation } from "../Loading";

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
            }, 4000);
          }
        }}
      >
        {({ isSubmitting }) =>
          isSubmitting ? (
            <LoadingAnimation text="Validating API key" />
          ) : (
            <Form>
              <TextFormField
                name="apiKey"
                type="password"
                label="OpenAI API Key:"
              />
              <div className="flex">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={
                    "bg-slate-500 hover:bg-slate-700 text-white " +
                    "font-bold py-2 px-4 rounded focus:outline-none " +
                    "focus:shadow-outline w-full mx-auto"
                  }
                >
                  Submit
                </button>
              </div>
            </Form>
          )
        }
      </Formik>
    </div>
  );
};
