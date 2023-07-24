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
import { deleteConnectorIfExists } from "@/lib/connector";
import { FormBodyBuilder, RequireAtLeastOne } from "./types";

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

interface BaseProps<T extends Yup.AnyObject> {
  nameBuilder: (values: T) => string;
  source: ValidSources;
  inputType: ValidInputTypes;
  credentialId?: number;
  // If both are specified, uses formBody
  formBody?: JSX.Element | null;
  formBodyBuilder?: FormBodyBuilder<T>;
  validationSchema: Yup.ObjectSchema<T>;
  initialValues: T;
  onSubmit: (isSuccess: boolean, responseJson?: Connector<T>) => void;
  refreshFreq?: number;
}

type ConnectorFormProps<T extends Yup.AnyObject> = RequireAtLeastOne<
  BaseProps<T>,
  "formBody" | "formBodyBuilder"
>;

export function ConnectorForm<T extends Yup.AnyObject>({
  nameBuilder,
  source,
  inputType,
  formBody,
  formBodyBuilder,
  validationSchema,
  initialValues,
  refreshFreq,
  onSubmit,
}: ConnectorFormProps<T>): JSX.Element {
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
          const connectorName = nameBuilder(values);

          // best effort check to see if existing connector exists
          // delete it if it does, the current assumption is that only
          // one google drive connector will exist at a time
          const errorMsg = await deleteConnectorIfExists({
            source,
            name: connectorName,
          });
          if (errorMsg) {
            setPopup({
              message: `Unable to delete existing connector - ${errorMsg}`,
              type: "error",
            });
            return;
          }

          const { message, isSuccess, response } = await submitConnector<T>({
            name: connectorName,
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
        {({ isSubmitting, values }) => (
          <Form>
            {formBody ? formBody : formBodyBuilder && formBodyBuilder(values)}
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
