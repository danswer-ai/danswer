import React, { useState } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import { Popup } from "./Popup";
import { ValidSources } from "./interfaces";

const handleSubmit = async (
  source: ValidSources,
  values: Yup.AnyObject,
  { setSubmitting }: FormikHelpers<Yup.AnyObject>,
  setPopup: (
    popup: { message: string; type: "success" | "error" } | null
  ) => void
): Promise<boolean> => {
  setSubmitting(true);
  let isSuccess = false;
  try {
    const response = await fetch(
      `/api/admin/connectors/${source}/index-attempt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ connector_specific_config: values }),
      }
    );

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
    return isSuccess;
  }
};

interface IndexFormProps<YupObjectType extends Yup.AnyObject> {
  source: ValidSources;
  formBody: JSX.Element | null;
  validationSchema: Yup.ObjectSchema<YupObjectType>;
  initialValues: YupObjectType;
  onSubmit: (isSuccess: boolean) => void;
  additionalNonFormValues?: Yup.AnyObject;
}

export function IndexForm<YupObjectType extends Yup.AnyObject>({
  source,
  formBody,
  validationSchema,
  initialValues,
  onSubmit,
  additionalNonFormValues = {},
}: IndexFormProps<YupObjectType>): JSX.Element {
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values, formikHelpers) => {
          handleSubmit(
            source,
            { ...values, ...additionalNonFormValues },
            formikHelpers as FormikHelpers<Yup.AnyObject>,
            setPopup
          ).then((isSuccess) => onSubmit(isSuccess));
        }}
      >
        {({ isSubmitting }) => (
          <Form>
            {formBody}
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
                Index
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
