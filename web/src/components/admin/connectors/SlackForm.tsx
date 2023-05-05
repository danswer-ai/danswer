import React, { useEffect, useState } from "react";
import { Formik, Form, Field, ErrorMessage, FormikHelpers } from "formik";
import * as Yup from "yup";
import { Popup } from "./Popup";

interface FormData {
  slack_bot_token: string;
  workspace_id: string;
}

const validationSchema = Yup.object().shape({
  slack_bot_token: Yup.string().required("Please enter your Slack Bot Token"),
  workspace_id: Yup.string().required("Please enter your Workspace ID"),
  pull_frequency: Yup.number().required(
    "Please enter a pull frequency (in minutes). 0 => no pulling from slack"
  ),
});

const getConfig = async (): Promise<FormData> => {
  const response = await fetch("/api/admin/slack_connector_config");
  return response.json();
};

const handleSubmit = async (
  values: FormData,
  { setSubmitting }: FormikHelpers<FormData>,
  setPopup: (
    popup: { message: string; type: "success" | "error" } | null
  ) => void
) => {
  setSubmitting(true);
  try {
    const response = await fetch("/api/admin/slack_connector_config", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(values),
    });

    if (response.ok) {
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
};

interface SlackFormProps {
  onSubmit: (isSuccess: boolean) => void;
}

export const SlackForm: React.FC<SlackFormProps> = ({ onSubmit }) => {
  const [initialValues, setInitialValues] = React.useState<FormData>();
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    getConfig().then((response) => {
      setInitialValues(response);
    });
  }, []);

  if (!initialValues) {
    // TODO (chris): improve
    return <div>Loading...</div>;
  }

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values, formikHelpers) =>
          handleSubmit(values, formikHelpers, setPopup)
        }
      >
        {({ isSubmitting }) => (
          <Form className="bg-white p-6 rounded shadow-md w-full max-w-md mx-auto">
            <div className="mb-4">
              <label
                htmlFor="slack_bot_token"
                className="block text-gray-700 mb-1"
              >
                Slack Bot Token:
              </label>
              <Field
                type="text"
                name="slack_bot_token"
                id="slack_bot_token"
                className="border border-gray-300 rounded w-full py-2 px-3 text-gray-700"
              />
              <ErrorMessage
                name="slack_bot_token"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="workspace_id"
                className="block text-gray-700 mb-1"
              >
                Workspace ID:
              </label>
              <Field
                type="text"
                name="workspace_id"
                id="workspace_id"
                className="border border-gray-300 rounded w-full py-2 px-3 text-gray-700"
              />
              <ErrorMessage
                name="workspace_id"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <div className="mb-4">
              <label
                htmlFor="workspace_id"
                className="block text-gray-700 mb-1"
              >
                Pull Frequency:
              </label>
              <Field
                type="text"
                name="pull_frequency"
                id="pull_frequency"
                className="border border-gray-300 rounded w-full py-2 px-3 text-gray-700"
              />
              <ErrorMessage
                name="pull_frequency"
                component="div"
                className="text-red-500 text-sm mt-1"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            >
              Submit
            </button>
          </Form>
        )}
      </Formik>
    </>
  );
};
