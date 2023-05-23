import React, { useState } from "react";
import { Formik, Form, FormikHelpers } from "formik";
import * as Yup from "yup";
import { Popup } from "./Popup";
import { ValidInputTypes, ValidSources } from "@/lib/types";

export const submitIndexRequest = async (
  source: ValidSources,
  values: Yup.AnyObject,
  inputType: ValidInputTypes = "load_state"
): Promise<{ message: string; isSuccess: boolean }> => {
  let isSuccess = false;
  try {
    const response = await fetch(
      `/api/admin/connectors/${source}/index-attempt`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          connector_specific_config: values,
          input_type: inputType,
        }),
      }
    );

    if (response.ok) {
      isSuccess = true;
      return { message: "Success!", isSuccess: true };
    } else {
      const errorData = await response.json();
      return { message: `Error: ${errorData.detail}`, isSuccess: false };
    }
  } catch (error) {
    return { message: `Error: ${error}`, isSuccess: false };
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
          formikHelpers.setSubmitting(true);
          submitIndexRequest(source, {
            ...values,
            ...additionalNonFormValues,
          }).then(({ message, isSuccess }) => {
            setPopup({ message, type: isSuccess ? "success" : "error" });
            formikHelpers.setSubmitting(false);
            setTimeout(() => {
              setPopup(null);
            }, 3000);
            onSubmit(isSuccess);
          });
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
