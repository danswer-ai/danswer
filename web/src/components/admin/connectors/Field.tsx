import { Button } from "@/components/Button";
import { ArrayHelpers, ErrorMessage, Field, FieldArray } from "formik";
import * as Yup from "yup";
import { FormBodyBuilder } from "./types";

interface TextFormFieldProps {
  name: string;
  label: string;
  subtext?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  autoCompleteDisabled?: boolean;
}

export const TextFormField = ({
  name,
  label,
  subtext,
  placeholder,
  type = "text",
  disabled = false,
  autoCompleteDisabled = false,
}: TextFormFieldProps) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block">
        {label}
      </label>
      {subtext && <p className="text-xs mb-1">{subtext}</p>}
      <Field
        type={type}
        name={name}
        id={name}
        className={
          `
          border 
          text-gray-200 
          border-gray-300 
          rounded 
          w-full 
          py-2 
          px-3 
          mt-1
        ` + (disabled ? " bg-slate-900" : " bg-slate-700")
        }
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoCompleteDisabled ? "off" : undefined}
      />
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
};

interface BooleanFormFieldProps {
  name: string;
  label: string;
  subtext?: string;
}

export const BooleanFormField = ({
  name,
  label,
  subtext,
}: BooleanFormFieldProps) => {
  return (
    <div className="mb-4">
      <label className="flex text-sm">
        <Field name={name} type="checkbox" className="mx-3 px-5" />
        <div>
          {label}
          {subtext && <p className="text-xs">{subtext}</p>}
        </div>
      </label>

      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
};

interface TextArrayFieldProps<T extends Yup.AnyObject> {
  name: string;
  label: string | JSX.Element;
  values: T;
  subtext?: string | JSX.Element;
  type?: string;
}

export function TextArrayField<T extends Yup.AnyObject>({
  name,
  label,
  values,
  subtext,
  type,
}: TextArrayFieldProps<T>) {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block">
        {label}
      </label>
      {subtext && <p className="text-xs">{subtext}</p>}

      <FieldArray
        name={name}
        render={(arrayHelpers: ArrayHelpers) => (
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
                      // Disable autocomplete since the browser doesn't know how to handle an array of text fields
                      autoComplete="off"
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
}

interface TextArrayFieldBuilderProps<T extends Yup.AnyObject> {
  name: string;
  label: string;
  subtext?: string;
  type?: string;
}

export function TextArrayFieldBuilder<T extends Yup.AnyObject>(
  props: TextArrayFieldBuilderProps<T>
): FormBodyBuilder<T> {
  const _TextArrayField: FormBodyBuilder<T> = (values) => (
    <TextArrayField {...props} values={values} />
  );
  return _TextArrayField;
}
