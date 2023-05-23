import { ErrorMessage, Field } from "formik";

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
