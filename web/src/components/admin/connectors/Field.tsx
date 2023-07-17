import { Button } from "@/components/Button";
import { ErrorMessage, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { FormBodyBuilder } from "./types";

interface TextFormFieldProps {
  name: string;
  label: string;
  subtext?: string;
  type?: string;
}

export const TextFormField = ({
  name,
  label,
  subtext,
  type = "text",
}: TextFormFieldProps) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block">
        {label}
      </label>
      {subtext && <p className="text-xs">{subtext}</p>}
      <Field
        type={type}
        name={name}
        id={name}
        className="border bg-slate-700 text-gray-200 border-gray-300 rounded w-full py-2 px-3 mt-1"
      />
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
};

interface TextArrayFieldProps {
  name: string;
  label: string;
  subtext?: string;
  type?: string;
}

export function TextArrayFieldBuilder<T extends Yup.AnyObject>({
  name,
  label,
  subtext,
  type = "text",
}: TextArrayFieldProps): FormBodyBuilder<T> {
  const TextArrayField: FormBodyBuilder<T> = (values) => (
    <div className="mb-4">
      <label htmlFor={name} className="block">
        {label}
      </label>
      {subtext && <p className="text-xs">{subtext}</p>}

      <FieldArray
        name={name}
        render={(arrayHelpers) => (
          <div>
            {values[name] &&
              values[name].length > 0 &&
              (values[name] as string[]).map((_, index) => (
                <div key={index} className="mt-2">
                  <div className="flex">
                    <Field
                      type={type}
                      name={`${name}.${index}`}
                      id={name}
                      className="border bg-slate-700 text-gray-200 border-gray-300 rounded w-full py-2 px-3 mr-2"
                    />
                    <Button
                      type="button"
                      onClick={() => arrayHelpers.remove(index)}
                      className="h-8 my-auto"
                    >
                      Remove
                    </Button>
                  </div>
                  <ErrorMessage
                    name={`${name}.${index}`}
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              ))}
            <Button
              type="button"
              onClick={() => {
                arrayHelpers.push("");
              }}
              className="mt-3"
            >
              Add New
            </Button>
          </div>
        )}
      />
    </div>
  );
  return TextArrayField;
}
