import { Form, Formik } from "formik";
import * as Yup from "yup";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { SlackBotTokens } from "@/lib/types";
import {
  TextArrayField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import {
  createSlackBotConfig,
  setSlackBotTokens,
  updateSlackBotConfig,
} from "./lib";

interface SlackBotTokensFormProps {
  onClose: () => void;
  setPopup: (popupSpec: PopupSpec | null) => void;
  existingTokens?: SlackBotTokens;
}

export const SlackBotTokensForm = ({
  onClose,
  setPopup,
  existingTokens,
}: SlackBotTokensFormProps) => {
  return (
    <div>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
        onClick={onClose}
      >
        <div
          className="bg-gray-800 p-6 rounded border border-gray-700 shadow-lg relative w-1/2 text-sm"
          onClick={(event) => event.stopPropagation()}
        >
          <Formik
            initialValues={existingTokens || { app_token: "", bot_token: "" }}
            validationSchema={Yup.object().shape({
              channel_names: Yup.array().of(Yup.string().required()),
              document_sets: Yup.array().of(Yup.number()),
            })}
            onSubmit={async (values, formikHelpers) => {
              formikHelpers.setSubmitting(true);
              const response = await setSlackBotTokens(values);
              formikHelpers.setSubmitting(false);
              if (response.ok) {
                setPopup({
                  message: "Successfully set Slack tokens!",
                  type: "success",
                });
                onClose();
              } else {
                const errorMsg = await response.text();
                setPopup({
                  message: `Error setting Slack tokens - ${errorMsg}`,
                  type: "error",
                });
              }
            }}
          >
            {({ isSubmitting }) => (
              <Form>
                <h2 className="text-lg font-bold mb-3">Set Slack Bot Tokens</h2>
                <TextFormField
                  name="bot_token"
                  label="Slack Bot Token"
                  type="password"
                />
                <TextFormField
                  name="app_token"
                  label="Slack App Token"
                  type="password"
                />
                <div className="flex">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={
                      "bg-slate-500 hover:bg-slate-700 text-white " +
                      "font-bold py-2 px-4 rounded focus:outline-none " +
                      "focus:shadow-outline w-full max-w-sm mx-auto"
                    }
                  >
                    Set Tokens
                  </button>
                </div>
              </Form>
            )}
          </Formik>
        </div>
      </div>
    </div>
  );
};
