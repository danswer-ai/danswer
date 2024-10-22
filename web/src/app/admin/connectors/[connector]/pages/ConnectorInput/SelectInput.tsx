/* import CredentialSubText from "@/components/credentials/CredentialFields";
import {
  ListOption,
  SelectOption,
  StringWithDescription,
} from "@/lib/connectors/connectors";
import { Field } from "formik";

export default function SelectInput({
  name,
  optional,
  description,
  options,
  label,
}: {
  name: string;
  optional?: boolean;
  description?: string;
  options: StringWithDescription[];
  label?: string;
}) {
  return (
    <>
      <label
        htmlFor={name}
        className="block mb-1 text-sm font-medium text-text-700"
      >
        {label}
        {optional && <span className="ml-1 text-text-500">(optional)</span>}
      </label>
      {description && <CredentialSubText>{description}</CredentialSubText>}

      <Field
        as="select"
        name={name}
        className="w-full p-2 bg-black border rounded-md bg-input border-border-medium focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="">Select an option</option>
        {options?.map((option: any) => (
          <option key={option.name} value={option.name}>
            {option.name}
          </option>
        ))}
      </Field>
    </>
  );
} */
import CredentialSubText from "@/components/credentials/CredentialFields";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select"; // Update the import path according to your project structure
import { StringWithDescription } from "@/lib/connectors/connectors";
import { Field } from "formik";

export default function SelectInput({
  name,
  optional,
  description,
  options,
  label,
}: {
  name: string;
  optional?: boolean;
  description?: string;
  options: StringWithDescription[];
  label?: string;
}) {
  return (
    <>
      <label
        htmlFor={name}
        className="block mb-1 text-sm font-medium text-text-700"
      >
        {label}
        {optional && <span className="ml-1 text-text-500">(optional)</span>}
      </label>
      {description && <CredentialSubText>{description}</CredentialSubText>}

      <Field name={name}>
        {({ field, form }: any) => (
          <Select
            value={field.value}
            onValueChange={(value) => form.setFieldValue(name, value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {options?.map((option) => (
                <SelectItem key={option.name} value={option.name}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </Field>
    </>
  );
}
