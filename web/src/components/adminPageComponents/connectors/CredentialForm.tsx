import React, { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Popup } from "./Popup";
import { CredentialBase } from "@/lib/types";
import { createCredential } from "@/lib/credential";
import { Button } from "@tremor/react";

export async function submitCredential<T>(
  credential: CredentialBase<T>
): Promise<{ message: string; isSuccess: boolean }> {
  let isSuccess = false;
  try {
    const response = await createCredential(credential);
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
            admin_public: true,
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
              <Button
                type="submit"
                size="xs"
                color="green"
                disabled={isSubmitting}
                className="mx-auto w-64"
              >
                Update
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
