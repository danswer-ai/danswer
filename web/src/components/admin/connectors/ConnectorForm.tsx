import React, { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Popup } from "./Popup";
import {
  Connector,
  ConnectorBase,
  ValidInputTypes,
  ValidSources,
} from "@/lib/types";

export async function submitConnector<T>(
  connector: ConnectorBase<T>
): Promise<{ message: string; isSuccess: boolean; response?: Connector<T> }> {
  let isSuccess = false;
  try {
    const response = await fetch(`/api/manage/admin/connector`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(connector),
    });

    if (response.ok) {
      isSuccess = true;
      const responseJson = await response.json();
      return { message: "Success!", isSuccess: true, response: responseJson };
    } else {
      const errorData = await response.json();
      return { message: `Error: ${errorData.detail}`, isSuccess: false };
    }
  } catch (error) {
    return { message: `Error: ${error}`, isSuccess: false };
  }
}

interface Props<T extends Yup.AnyObject> {
  nameBuilder: (values: T) => string;
  source: ValidSources;
  inputType: ValidInputTypes;
  credentialId?: number;
  formBody: JSX.Element | null;
  validationSchema: Yup.ObjectSchema<T>;
  initialValues: T;
  onSubmit: (isSuccess: boolean, responseJson?: Connector<T>) => void;
  refreshFreq?: number;
}

export function ConnectorForm<T extends Yup.AnyObject>({
  nameBuilder,
  source,
  inputType,
  formBody,
  validationSchema,
  initialValues,
  refreshFreq,
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
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);

          const { message, isSuccess, response } = await submitConnector<T>({
            name: nameBuilder(values),
            source,
            input_type: inputType,
            connector_specific_config: values,
            refresh_freq: refreshFreq || 0,
            disabled: false,
          });

          setPopup({ message, type: isSuccess ? "success" : "error" });
          formikHelpers.setSubmitting(false);
          if (isSuccess) {
            formikHelpers.resetForm();
          }
          setTimeout(() => {
            setPopup(null);
          }, 4000);
          onSubmit(isSuccess, response);
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
                Connect
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
