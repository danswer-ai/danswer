import {
  ArrayHelpers,
  ErrorMessage,
  Field,
  FieldArray,
  FieldProps,
  useField,
  useFormikContext,
} from "formik";
import * as Yup from "yup";
import { FormBodyBuilder } from "./types";
import { DefaultDropdown, StringOrNumberOption } from "@/components/Dropdown";
import { FiX } from "react-icons/fi";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label as ShadcnLabel } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, X } from "lucide-react";

export function SectionHeader({
  children,
}: {
  children: string | JSX.Element;
}) {
  return <div className="mb-4 font-bold text-lg">{children}</div>;
}

export function Label({ children }: { children: string | JSX.Element }) {
  return <div className="block font-medium text-base">{children}</div>;
}

export function SubLabel({ children }: { children: string | JSX.Element }) {
  return <span className="text-sm text-subtle mb-2">{children}</span>;
}

export function ManualErrorMessage({ children }: { children: string }) {
  return <div className="text-error text-sm mt-1">{children}</div>;
}

export function TextFormField({
  name,
  label,
  subtext,
  placeholder,
  onChange,
  type = "text",
  isTextArea = false,
  disabled = false,
  autoCompleteDisabled = true,
  error,
  defaultHeight,
  isCode = false,
  fontSize,
  hideError,
}: {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  placeholder?: string;
  onChange?: (
    e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => void;
  type?: string;
  isTextArea?: boolean;
  disabled?: boolean;
  autoCompleteDisabled?: boolean;
  error?: string;
  defaultHeight?: string;
  isCode?: boolean;
  fontSize?: "text-sm" | "text-base" | "text-lg";
  hideError?: boolean;
}) {
  let heightString = defaultHeight || "";
  if (isTextArea && !heightString) {
    heightString = "h-28";
  }

  return (
    <div className="grid gap-2 pb-4">
      <div className="grid leading-none">
        <ShadcnLabel
          htmlFor={label}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed"
        >
          {label}
        </ShadcnLabel>
        {subtext && <p className="text-sm text-muted-foreground">{subtext}</p>}
      </div>
      <Field name={name}>
        {({ field }: FieldProps) => {
          const Component = isTextArea ? Textarea : Input;
          return (
            <Component
              {...field}
              type={type}
              name={name}
              id={name}
              disabled={disabled}
              placeholder={placeholder}
              autoComplete={autoCompleteDisabled ? "off" : undefined}
              {...(onChange ? { onChange } : {})}
              className={isTextArea ? "max-h-[1000px]" : ""}
            />
          );
        }}
      </Field>
      {error ? (
        <ManualErrorMessage>{error}</ManualErrorMessage>
      ) : (
        !hideError && (
          <ErrorMessage
            name={name}
            component="div"
            className="text-red-500 text-sm mt-1"
          />
        )
      )}
    </div>
  );
}

interface BooleanFormFieldProps {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  onChange?: (checked: boolean) => void;
}

export const BooleanFormField = ({
  name,
  label,
  subtext,
  onChange,
}: BooleanFormFieldProps) => {
  const [field, meta, helpers] = useField(name);

  const handleChange = (checked: boolean) => {
    helpers.setValue(checked);
    if (onChange) {
      onChange(checked);
    }
  };

  return (
    <div className="mb-4">
      <label className="flex text-sm space-x-2">
        <Checkbox
          id={label}
          checked={field.value}
          onCheckedChange={handleChange}
        />

        <div className="grid gap-1.5 leading-none">
          <ShadcnLabel htmlFor={label}>{label}</ShadcnLabel>
          {subtext && (
            <p className="text-sm text-muted-foreground">{subtext}</p>
          )}
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
    <div className="pb-4">
      <ShadcnLabel>{label}</ShadcnLabel>
      {subtext && <SubLabel>{subtext}</SubLabel>}

      <FieldArray
        name={name}
        render={(arrayHelpers: ArrayHelpers) => (
          <div>
            {values[name] &&
              values[name].length > 0 &&
              (values[name] as string[]).map((_, index) => (
                <div key={index} className="mt-2">
                  <div className="flex">
                    <Field name={`${name}.${index}`}>
                      {({ field }: FieldProps) => (
                        <Input
                          {...field}
                          id={`${name}.${index}`}
                          name={`${name}.${index}`}
                          autoComplete="off"
                        />
                      )}
                    </Field>

                    <Button variant="ghost" size="icon">
                      <X size={16} onClick={() => arrayHelpers.remove(index)} />
                    </Button>
                  </div>
                  <ErrorMessage
                    name={`${name}.${index}`}
                    component="div"
                    className="text-error text-sm mt-1"
                  />
                </div>
              ))}

            <Button
              onClick={() => {
                arrayHelpers.push("");
              }}
              className="mt-3"
              type="button"
            >
              <Plus size={16} /> Add New
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
  subtext?: string | JSX.Element;
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

interface SelectorFormFieldProps {
  name: string;
  label?: string;
  options: StringOrNumberOption[];
  subtext?: string;
  includeDefault?: boolean;
  side?: "top" | "bottom" | "left" | "right";
  maxHeight?: string;
  onSelect?: (selected: string) => void;
}

export function SelectorFormField({
  name,
  label,
  options,
  subtext,
  includeDefault = false,
  side = "bottom",
  maxHeight,
  onSelect,
}: SelectorFormFieldProps) {
  const [field, , { setValue }] = useField<string>(name);
  const { setFieldValue, resetForm } = useFormikContext();

  // Ensure field value is reset correctly
  const handleSelectChange = (selected: string) => {
    setFieldValue(name, selected);
    if (onSelect) onSelect(selected);
  };

  const selectedOption = options.find(
    (option) => String(option.value) === field.value
  );

  return (
    <div className="mb-4">
      {label && <ShadcnLabel>{label}</ShadcnLabel>}
      {subtext && <SubLabel>{subtext}</SubLabel>}

      <div>
        <Select
          value={field.value || ""} // Ensure field.value is reset correctly
          onValueChange={handleSelectChange}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an option">
              {selectedOption ? selectedOption.name : "Select an option"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {includeDefault && <SelectItem value="default">Default</SelectItem>}
            {options.map((option) => (
              <SelectItem
                key={String(option.value)}
                value={String(option.value)}
              >
                {option.description ? (
                  <div>
                    <p>{option.name}</p>
                    <p className="text-xs text-subtle group-hover:text-inverted group-focus:text-inverted">
                      {option.description}
                    </p>
                  </div>
                ) : (
                  <>{option.name}</>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
}
