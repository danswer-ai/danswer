import React, { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Popup } from "./Popup";
import { CredentialBase } from "@/lib/types";

export async function submitCredential<T>(
  connector: CredentialBase<T>
): Promise<{ message: string; isSuccess: boolean }> {
  let isSuccess = false;
  try {
    const response = await fetch(`/api/manage/credential`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(connector),
    });

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
}

interface Props<YupObjectType extends Yup.AnyObject> {
  formBody: JSX.Element | null;
  validationSchema: Yup.ObjectSchema<YupObjectType>;
  initialValues: YupObjectType;
  onSubmit: (isSuccess: boolean) => void;
}

export function CredentialForm<T extends Yup.AnyObject>({
  formBody,
  validationSchema,
  initialValues,
  onSubmit,
}: Props<T>): JSX.Element {
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
          submitCredential<T>({
            credential_json: values,
            is_admin: true,
          }).then(({ message, isSuccess }) => {
            setPopup({ message, type: isSuccess ? "success" : "error" });
            formikHelpers.setSubmitting(false);
            setTimeout(() => {
              setPopup(null);
            }, 4000);
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
                Update
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
