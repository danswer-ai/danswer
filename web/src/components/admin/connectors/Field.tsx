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
import { FiPlus, FiX } from "react-icons/fi";
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
      <div className="grid gap-0.5 leading-none">
        <ShadcnLabel
          htmlFor={label}
          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
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
  onChange?: (e: React.ChangeEvent<HTMLButtonElement>) => void;
}

export const BooleanFormField = ({
  name,
  label,
  subtext,
  onChange,
}: BooleanFormFieldProps) => {
  return (
    <div className="mb-4">
      <div className="flex text-sm mb-4 gap-3">
        <Field name={name}>
          {({ field }: FieldProps) => (
            <Checkbox
              {...field}
              name={name}
              id={label}
              {...(onChange ? { onChange } : {})}
            />
          )}
        </Field>
        <div className="grid gap-1.5 leading-none">
          <ShadcnLabel htmlFor={label}>{label}</ShadcnLabel>
          {subtext && (
            <p className="text-sm text-muted-foreground">{subtext}</p>
          )}
        </div>
      </div>

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
      <Label>{label}</Label>
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
                    <Field
                      type={type}
                      name={`${name}.${index}`}
                      id={name}
                      className={`
                      border 
                      border-border 
                      bg-background 
                      rounded 
                      w-full 
                      py-2 
                      px-3 
                      mr-4
                      `}
                      // Disable autocomplete since the browser doesn't know how to handle an array of text fields
                      autoComplete="off"
                    />
                    <div className="my-auto">
                      <FiX
                        className="my-auto w-10 h-10 cursor-pointer hover:bg-hover rounded p-2"
                        onClick={() => arrayHelpers.remove(index)}
                      />
                    </div>
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
              <FiPlus className="mr-1.5" /> Add New
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
  subtext?: string | JSX.Element;
  includeDefault?: boolean;
  side?: "top" | "right" | "bottom" | "left";
  maxHeight?: string;
  onSelect?: (selected: string | number | null) => void;
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
  const [field] = useField<string>(name);
  const { setFieldValue } = useFormikContext();

  return (
    <div className="mb-4">
      {label && <Label>{label}</Label>}
      {subtext && <SubLabel>{subtext}</SubLabel>}

      <div className="mt-2">
        <Select
          value={field.value || ""}
          onValueChange={(selected) => {
            if (onSelect) {
              onSelect(selected);
            } else {
              setFieldValue(name, selected);
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select an option" />
          </SelectTrigger>
          <SelectContent>
            {includeDefault && <SelectItem value="default">Default</SelectItem>}
            {options.map((option) => (
              <SelectItem
                key={String(option.value)}
                value={String(option.value)}
              >
                {option.name}
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
