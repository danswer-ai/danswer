import React, { useState } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import { BACKEND_URL } from "@/lib/constants";
import { Popup } from "./Popup";
import { TextFormField } from "./Field";

interface FormData {
  url: string;
}

const validationSchema = Yup.object().shape({
  url: Yup.string().required(
    "Please enter the website URL to scrape e.g. https://docs.github.com/en/actions"
  ),
});

const handleSubmit = async (
  values: FormData,
  { setSubmitting }: FormikHelpers<FormData>,
  setPopup: (
    popup: { message: string; type: "success" | "error" } | null
  ) => void
) => {
  setSubmitting(true);
  try {
    // TODO (chris): replace this with actual call
    const response = await fetch(BACKEND_URL + "/admin/website_index", {
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

export const WebIndexForm: React.FC<SlackFormProps> = ({ onSubmit }) => {
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <Formik
        initialValues={{ url: "" }}
        validationSchema={validationSchema}
        onSubmit={(values, formikHelpers) =>
          handleSubmit(values, formikHelpers, setPopup)
        }
      >
        {({ isSubmitting }) => (
          <Form>
            <TextFormField name="url" label="URL to Scrape:" />
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-slate-500 hover:bg-slate-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
            >
              Index
            </button>
          </Form>
        )}
      </Formik>
    </>
  );
};
