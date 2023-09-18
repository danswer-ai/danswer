import React, { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { Popup, usePopup } from "./Popup";
import {
  Connector,
  ConnectorBase,
  ValidInputTypes,
  ValidSources,
} from "@/lib/types";
import { deleteConnectorIfExists } from "@/lib/connector";
import { FormBodyBuilder, RequireAtLeastOne } from "./types";
import { TextFormField } from "./Field";
import { linkCredential } from "@/lib/credential";
import { useSWRConfig } from "swr";

const BASE_CONNECTOR_URL = "/api/manage/admin/connector";

export async function submitConnector<T>(
  connector: ConnectorBase<T>,
  connectorId?: number
): Promise<{ message: string; isSuccess: boolean; response?: Connector<T> }> {
  const isUpdate = connectorId !== undefined;

  let isSuccess = false;
  try {
    const response = await fetch(
      BASE_CONNECTOR_URL + (isUpdate ? `/${connectorId}` : ""),
      {
        method: isUpdate ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(connector),
      }
    );

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

const CCPairNameHaver = Yup.object().shape({
  cc_pair_name: Yup.string().required("Please enter a name for the connector"),
});

interface BaseProps<T extends Yup.AnyObject> {
  nameBuilder: (values: T) => string;
  source: ValidSources;
  inputType: ValidInputTypes;
  credentialId?: number; // if specified, will automatically try and link the credential
  // If both are specified, will render formBody and then formBodyBuilder
  formBody?: JSX.Element | null;
  formBodyBuilder?: FormBodyBuilder<T>;
  validationSchema: Yup.ObjectSchema<T>;
  initialValues: T;
  onSubmit?: (
    isSuccess: boolean,
    responseJson: Connector<T> | undefined
  ) => void;
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
  credentialId,
  formBody,
  formBodyBuilder,
  validationSchema,
  initialValues,
  refreshFreq,
  onSubmit,
}: ConnectorFormProps<T>): JSX.Element {
  const { mutate } = useSWRConfig();
  const { popup, setPopup } = usePopup();

  const credentialPassedIn = credentialId !== undefined;

  return (
    <>
      {popup}
      <Formik
        initialValues={
          credentialPassedIn
            ? { cc_pair_name: "", ...initialValues }
            : initialValues
        }
        validationSchema={
          credentialPassedIn
            ? validationSchema.concat(CCPairNameHaver)
            : validationSchema
        }
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

          if (!isSuccess || !response) {
            setPopup({ message, type: "error" });
            formikHelpers.setSubmitting(false);
            return;
          }

          if (credentialId !== undefined) {
            const linkCredentialResponse = await linkCredential(
              response.id,
              credentialId,
              values.cc_pair_name
            );
            if (!linkCredentialResponse.ok) {
              const linkCredentialErrorMsg =
                await linkCredentialResponse.text();
              setPopup({
                message: `Error linking credential - ${linkCredentialErrorMsg}`,
                type: "error",
              });
              formikHelpers.setSubmitting(false);
              return;
            }
          }

          mutate("/api/manage/admin/connector/indexing-status");
          setPopup({ message, type: isSuccess ? "success" : "error" });
          formikHelpers.setSubmitting(false);
          if (isSuccess) {
            formikHelpers.resetForm();
          }
          if (onSubmit) {
            onSubmit(isSuccess, response);
          }
        }}
      >
        {({ isSubmitting, values }) => (
          <Form>
            {credentialPassedIn && (
              <TextFormField name="cc_pair_name" label="Connector Name" />
            )}
            {formBody && formBody}
            {formBodyBuilder && formBodyBuilder(values)}
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

interface UpdateConnectorBaseProps<T extends Yup.AnyObject> {
  nameBuilder?: (values: T) => string;
  existingConnector: Connector<T>;
  // If both are specified, uses formBody
  formBody?: JSX.Element | null;
  formBodyBuilder?: FormBodyBuilder<T>;
  validationSchema: Yup.ObjectSchema<T>;
  onSubmit?: (isSuccess: boolean, responseJson?: Connector<T>) => void;
}

type UpdateConnectorFormProps<T extends Yup.AnyObject> = RequireAtLeastOne<
  UpdateConnectorBaseProps<T>,
  "formBody" | "formBodyBuilder"
>;

export function UpdateConnectorForm<T extends Yup.AnyObject>({
  nameBuilder,
  existingConnector,
  formBody,
  formBodyBuilder,
  validationSchema,
  onSubmit,
}: UpdateConnectorFormProps<T>): JSX.Element {
  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <Formik
        initialValues={existingConnector.connector_specific_config}
        validationSchema={validationSchema}
        onSubmit={async (values, formikHelpers) => {
          formikHelpers.setSubmitting(true);

          const { message, isSuccess, response } = await submitConnector<T>(
            {
              name: nameBuilder ? nameBuilder(values) : existingConnector.name,
              source: existingConnector.source,
              input_type: existingConnector.input_type,
              connector_specific_config: values,
              refresh_freq: existingConnector.refresh_freq,
              disabled: false,
            },
            existingConnector.id
          );

          setPopup({ message, type: isSuccess ? "success" : "error" });
          formikHelpers.setSubmitting(false);
          if (isSuccess) {
            formikHelpers.resetForm();
          }
          setTimeout(() => {
            setPopup(null);
          }, 4000);
          if (onSubmit) {
            onSubmit(isSuccess, response);
          }
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
                Update
              </button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
