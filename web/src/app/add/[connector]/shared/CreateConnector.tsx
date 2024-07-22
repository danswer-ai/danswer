import React from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import { FaNewspaper, FaPlus, FaTrash } from "react-icons/fa";
import { EditingValue } from "@/components/credentials/EditingValue";
import { DynamicConnectionFormProps } from "./types";
import { Button, Divider } from "@tremor/react";
import CredentialSubText from "@/components/credentials/CredentialSubText";
import { TrashIcon } from "@/components/icons/icons";

const DynamicConnectionForm: React.FC<DynamicConnectionFormProps> = ({
  config,
  onSubmit,
  onClose,
  defaultValues,
}) => {
  const initialValues =
    defaultValues ||
    config.values.reduce(
      (acc, field) => {
        acc[field.name] = defaultValues
          ? defaultValues[field.name]
          : field.type === "list"
            ? [""]
            : field.type === "checkbox"
              ? false
              : "";
        return acc;
      },
      {} as Record<string, any>
    );

  const validationSchema = Yup.object().shape(
    config.values.reduce(
      (acc, field) => {
        let schema: any =
          field.type === "list"
            ? Yup.array().of(Yup.string())
            : field.type === "checkbox"
              ? Yup.boolean()
              : Yup.string();

        if (!field.optional) {
          schema = schema.required(`${field.label} is required`);
        }
        acc[field.name] = schema;
        return acc;
      },
      {} as Record<string, any>
    )
  );

  return (
    <div className="py-4 rounded-lg  max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-neutral-800">
        {config.description}
      </h2>
      {config.subtext && (
        <CredentialSubText>{config.subtext}</CredentialSubText>
      )}
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={(values, formikHelpers) => {
          onSubmit(values);
        }}
      >
        {({ setFieldValue, values }) => (
          <Form className="space-y-6">
            <EditingValue
              description="A descriptive name for the connector. This will just be used to identify the connector in the Admin UI."
              setFieldValue={setFieldValue}
              type={"text"}
              label={"Connector Name"}
              name={"Name"}
              currentValue=""
            />
            {config.values.map((field) => {
              if (!field.hidden) {
                return (
                  <div key={field.name}>
                    {field.type === "list" ? (
                      <FieldArray name={field.name}>
                        {({ push, remove }) => (
                          <div>
                            <label
                              htmlFor={field.name}
                              className="block text-sm font-medium text-neutral-700 mb-1"
                            >
                              {field.label}
                              {field.optional && (
                                <span className="text-neutral-500 ml-1">
                                  (optional)
                                </span>
                              )}
                            </label>
                            {field.description && (
                              <CredentialSubText>
                                {field.description}
                              </CredentialSubText>
                            )}

                            {values[field.name].map((_: any, index: number) => (
                              <div key={index} className="w-full flex mb-4">
                                <Field
                                  name={`${field.name}.${index}`}
                                  className="w-full bg-input text-sm p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mr-2"
                                />
                                <button
                                  type="button"
                                  onClick={() => remove(index)}
                                  className="p-2 my-auto bg-input flex-none rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                                >
                                  <TrashIcon className="text-white my-auto" />
                                </button>
                              </div>
                            ))}

                            <button
                              type="button"
                              onClick={() => push("")}
                              className="mt-2 p-2 bg-rose-500 text-xs text-white rounded-md hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-50 flex items-center"
                            >
                              <FaPlus className="mr-2" />
                              Add {field.label}
                            </button>
                          </div>
                        )}
                      </FieldArray>
                    ) : field.type === "select" ? (
                      <>
                        <label
                          htmlFor={field.name}
                          className="block text-sm font-medium text-neutral-700 mb-1"
                        >
                          {field.label}
                          {field.optional && (
                            <span className="text-neutral-500 ml-1">
                              (optional)
                            </span>
                          )}
                        </label>
                        {field.description && (
                          <CredentialSubText>
                            {field.description}
                          </CredentialSubText>
                        )}
                        <Field
                          as="select"
                          name={field.name}
                          className="w-full p-2 border bg-input border-neutral-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        >
                          <option value="">Select an option</option>
                          {field.options?.map((option) => (
                            <option key={option.name} value={option.name}>
                              {option.name}
                            </option>
                          ))}
                        </Field>
                      </>
                    ) : (
                      <>
                        <EditingValue
                          description={field.description}
                          optional={field.optional}
                          setFieldValue={setFieldValue}
                          type={field.type}
                          label={field.label}
                          name={field.name}
                          currentValue={field.query}
                        />
                      </>
                    )}
                  </div>
                );
              }
            })}
            <Divider />
            <EditingValue
              description={`If set, then documents indexed by this connector will be visible to all users. If turned off, then only users who explicitly have been given access to the documents (e.g. through a User Group) will have access`}
              optional
              setFieldValue={setFieldValue}
              type={"checkbox"}
              label={"Documents are Public?"}
              name={"Documents are Public?"}
              currentValue=""
            />
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default DynamicConnectionForm;
