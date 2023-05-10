import React, { useState } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import { Popup } from "../../../../components/admin/connectors/Popup";
import { TextFormField } from "../../../../components/admin/connectors/Field";
import { SlackConfig } from "./interfaces";

const validationSchema = Yup.object().shape({
  slack_bot_token: Yup.string().required("Please enter your Slack Bot Token"),
  workspace_id: Yup.string().required("Please enter your Workspace ID"),
  pull_frequency: Yup.number().required(
    "Please enter a pull frequency (in minutes). 0 => no pulling from slack"
  ),
});

const handleSubmit = async (
  values: SlackConfig,
  { setSubmitting }: FormikHelpers<SlackConfig>,
  setPopup: (
    popup: { message: string; type: "success" | "error" } | null
  ) => void
) => {
  let isSuccess = false;
  setSubmitting(true);
  try {
    const response = await fetch("/api/admin/connectors/slack/config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (response.ok) {
      isSuccess = true;
      setPopup({ message: "Success!", type: "success" });
    } else {
      const errorData = await response.json();
      setPopup({ message: `Error: ${errorData.detail}`, type: "error" });
    }
  } catch (error) {
    setPopup({ message: `Error: ${error}`, type: "error" });
  } finally {
    setSubmitting(false);
    setTimeout(() => {
      setPopup(null);
    }, 3000);
  }
  return isSuccess;
};

interface SlackFormProps {
  existingSlackConfig: SlackConfig;
  onSubmit: (isSuccess: boolean) => void;
}

export const SlackForm: React.FC<SlackFormProps> = ({
  existingSlackConfig,
  onSubmit,
}) => {
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <Formik
        initialValues={existingSlackConfig}
        validationSchema={validationSchema}
        onSubmit={(values, formikHelpers) =>
          handleSubmit(values, formikHelpers, setPopup).then((isSuccess) =>
            onSubmit(isSuccess)
          )
        }
      >
        {({ isSubmitting }) => (
          <Form>
            <TextFormField name="slack_bot_token" label="Slack Bot Token:" />
            <TextFormField name="workspace_id" label="Workspace ID:" />
            <TextFormField name="pull_frequency" label="Pull Frequency:" />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-500 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            >
              Update
            </button>
          </Form>
        )}
      </Formik>
    </>
  );
};
