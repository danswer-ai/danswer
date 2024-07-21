import React from "react";
import { Formik, Form, Field, FieldArray, ErrorMessage } from "formik";
import * as Yup from "yup";
import { FaNewspaper, FaPlus, FaTrash } from "react-icons/fa";
import { EditingValue } from "@/components/credentials/EditingValue";
import { DynamicConnectionFormProps } from "./types";

const DynamicConnectionForm: React.FC<DynamicConnectionFormProps> = ({
  config,
  onSubmit,
  onClose,
}) => {
  const initialValues = config.values.reduce(
    (acc, field) => {
      acc[field.name] =
        field.type === "list" ? [""] : field.type === "checkbox" ? false : "";
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
    <div className="brounded-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-neutral-800">
        Connection Configuration
      </h2>
      <p className="mb-6 text-neutral-600">{config.description}</p>
      <Formik
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={async (_, { setSubmitting }) => {
          try {
            onSubmit();
            onClose();
          } catch (error) {
            console.error("Error submitting form:", error);
          } finally {
            setSubmitting(false);
          }
        }}
      >
        {({ setFieldValue, values }) => (
          <Form className="space-y-6">
            {config.values.map((field) => (
              <div key={field.name}>
                <label
                  htmlFor={field.name}
                  className="block text-sm font-medium text-neutral-700 mb-1"
                >
                  {field.label}
                  {field.optional && (
                    <span className="text-neutral-500 ml-1">(optional)</span>
                  )}
                </label>

                {field.type === "list" ? (
                  <FieldArray name={field.name}>
                    {({ push, remove }) => (
                      <div>
                        {values[field.name].map((_: any, index: number) => (
                          <div key={index} className="w-full flex mb-2">
                            <Field
                              name={`${field.name}.${index}`}
                              placeholder={field.query}
                              className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mr-2"
                            />
                            <button
                              type="button"
                              onClick={() => remove(index)}
                              className="p-2 my-auto flex-none rounded-md bg-red-500 text-white hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => push("")}
                          className="mt-2 p-2 bg-rose-500 text-white rounded-md hover:bg-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-opacity-50 flex items-center"
                        >
                          <FaPlus className="mr-2" />
                          Add {field.label}
                        </button>
                      </div>
                    )}
                  </FieldArray>
                ) : field.type === "select" ? (
                  <Field
                    as="select"
                    name={field.name}
                    className="w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Select an option</option>
                    {field.options?.map((option) => (
                      <option key={option.name} value={option.name}>
                        {option.name}
                      </option>
                    ))}
                  </Field>
                ) : (
                  <EditingValue
                    setFieldValue={setFieldValue}
                    type={field.type === "checkbox" ? "checkbox" : "text"}
                    label={field.name}
                    name={field.name}
                    currentValue={field.query}
                    className={
                      field.type === "checkbox"
                        ? "h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-neutral-300 rounded"
                        : "w-full p-2 border border-neutral-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    }
                  />
                )}
                <ErrorMessage
                  name={field.name}
                  component="div"
                  className="text-red-500 text-sm mt-1"
                />
              </div>
            ))}
          </Form>
        )}
      </Formik>
    </div>
  );
};

export default DynamicConnectionForm;
