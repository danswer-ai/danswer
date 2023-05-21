import { ErrorMessage, Field } from "formik";

interface TextFormFieldProps {
  name: string;
  label: string;
  type?: string;
}

export const TextFormField = ({
  name,
  label,
  type = "text",
}: TextFormFieldProps) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block mb-1">
        {label}
      </label>
      <Field
        type={type}
        name={name}
        id={name}
        className="border bg-slate-700 text-gray-200 border-gray-300 rounded w-full py-2 px-3"
      />
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
};
