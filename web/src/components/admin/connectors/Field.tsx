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
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@radix-ui/react-tooltip";
import { Plus, X } from "lucide-react";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Tooltip as SchadcnTooltip } from "@/components/tooltip/Tooltip";
import { FiInfo } from "react-icons/fi";
import { useState } from "react";
import { FaMarkdown } from "react-icons/fa";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function SectionHeader({
  children,
}: {
  children: string | JSX.Element;
}) {
  return <div className="mb-4 text-lg font-bold">{children}</div>;
}

export function Label({
  children,
  className,
  small,
}: {
  children: string | JSX.Element;
  className?: string | JSX.Element;
  small?: boolean;
}) {
  return (
    <div
      className={`block font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 pb-1.5" ${className} ${small ? "text-sm" : "text-base"}`}
    >
      {children}
    </div>
  );
}

export function ToolTipDetails({
  children,
}: {
  children: string | JSX.Element;
}) {
  return (
    <div>
      <CustomTooltip trigger={<FiInfo size={12} />}>{children}</CustomTooltip>
    </div>
  );
}

export function LabelWithTooltip({
  children,
  tooltip,
}: {
  children: string | JSX.Element;
  tooltip: string;
}) {
  return (
    <div className="flex items-center gap-x-2">
      <Label>{children}</Label>
      <ToolTipDetails>{tooltip}</ToolTipDetails>
    </div>
  );
}

export function SubLabel({ children }: { children: string | JSX.Element }) {
  return <p className="pb-2 text-sm text-subtle">{children}</p>;
}

export function ManualErrorMessage({ children }: { children: string }) {
  return <div className="mt-1 text-sm text-error">{children}</div>;
}

export function ExplanationText({
  text,
  link,
}: {
  text: string;
  link?: string;
}) {
  return link ? (
    <a
      className="text-sm font-medium underline cursor-pointer text-text-500"
      target="_blank"
      href={link}
    >
      {text}
    </a>
  ) : (
    <div className="text-sm font-semibold">{text}</div>
  );
}

export function TextFormField({
  value,
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
  tooltip,
  hideError,
  fullWidth,
  onFocus,
  onBlur,
  optional = false,
  explanationText,
  explanationLink,
  width,
  maxHeight,
  small,
}: {
  small?: boolean;
  value?: string;
  name: string;
  label?: string;
  subtext?: string | JSX.Element;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  isTextArea?: boolean;
  disabled?: boolean;
  autoCompleteDisabled?: boolean;
  error?: string;
  tooltip?: string;
  defaultHeight?: string;
  isCode?: boolean;
  fontSize?: "text-sm" | "text-base" | "text-lg";
  hideError?: boolean;
  fullWidth?: boolean;
  maxHeight?: number;
  onFocus?: (
    e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => void;
  onBlur?: (
    e: React.FocusEvent<HTMLTextAreaElement | HTMLInputElement>
  ) => void;
  optional?: boolean;
  explanationText?: string;
  explanationLink?: string;
  width?: string;
}) {
  let heightString = defaultHeight || "";
  if (isTextArea && !heightString) {
    heightString = "h-28";
  }

  const [field, , helpers] = useField(name);
  const { setValue } = helpers;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setValue(e.target.value);
    if (onChange) {
      onChange(e as React.ChangeEvent<HTMLInputElement>);
    }
  };

  return (
    <div
      className={`grid pb-4 ${fullWidth ? "w-full" : ""} ${width ? width : ""}`}
    >
      {(label || subtext) && (
        <div className="grid leading-none">
          <div className="flex items-start gap-2">
            {label && (
              <Label className="text-text-950" small={small}>
                {label}
              </Label>
            )}
            {tooltip && <ToolTipDetails>{tooltip}</ToolTipDetails>}
          </div>
          {subtext && (
            <p className="text-sm text-muted-foreground pb-1.5">{subtext}</p>
          )}
        </div>
      )}
      <Field name={name}>
        {({ field }: FieldProps) => {
          const Component = isTextArea ? Textarea : Input;
          return (
            <Component
              {...field}
              type={type}
              name={name}
              id={name}
              defaultValue={value}
              required={!optional}
              disabled={disabled}
              placeholder={placeholder}
              autoComplete={autoCompleteDisabled ? "off" : undefined}
              onChange={handleChange}
              onFocus={onFocus}
              onBlur={onBlur}
              className={`
                ${fontSize}
                ${disabled ? " bg-background-strong" : " bg-white"}
                ${isCode ? " font-mono" : ""}
              `}
              style={{
                maxHeight:
                  isTextArea && !maxHeight
                    ? "1000px"
                    : maxHeight
                      ? `${maxHeight}px`
                      : "",
              }}
            />
          );
        }}
      </Field>
      {explanationText && (
        <ExplanationText link={explanationLink} text={explanationText} />
      )}
      {error ? (
        <ManualErrorMessage>{error}</ManualErrorMessage>
      ) : (
        !hideError && (
          <ErrorMessage
            name={name}
            component="div"
            className="mt-1 text-sm text-red-500"
          />
        )
      )}
    </div>
  );
}

interface MarkdownPreviewProps {
  name: string;
  label: string;
  placeholder?: string;
  error?: string;
}

export const MarkdownFormField = ({
  name,
  label,
  error,
  placeholder = "Enter your markdown here...",
}: MarkdownPreviewProps) => {
  const [field, _] = useField(name);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const togglePreview = () => {
    setIsPreviewOpen(!isPreviewOpen);
  };

  return (
    <div className="flex flex-col mb-4 space-y-4">
      <Label>{label}</Label>
      <div className="border border-gray-300 rounded-md">
        <div className="flex items-center justify-between px-4 py-2 bg-gray-100 rounded-t-md">
          <div className="flex items-center space-x-2">
            <FaMarkdown className="text-gray-500" />
            <span className="text-sm font-semibold text-gray-600">
              Markdown
            </span>
          </div>
          <button
            type="button"
            onClick={togglePreview}
            className="text-sm font-semibold text-gray-600 hover:text-gray-800 focus:outline-none"
          >
            {isPreviewOpen ? "Write" : "Preview"}
          </button>
        </div>
        {isPreviewOpen ? (
          <div className="p-4 border-t border-gray-300">
            <ReactMarkdown className="prose" remarkPlugins={[remarkGfm]}>
              {field.value}
            </ReactMarkdown>
          </div>
        ) : (
          <div className="px-2 pt-2">
            <textarea
              {...field}
              rows={2}
              placeholder={placeholder}
              className={`w-full p-2 border border-border rounded-md`}
            />
          </div>
        )}
      </div>
      {error ? (
        <ManualErrorMessage>{error}</ManualErrorMessage>
      ) : (
        <ErrorMessage
          name={name}
          component="div"
          className="mt-1 text-sm text-red-500"
        />
      )}
    </div>
  );
};

interface BooleanFormFieldProps {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  noLabel?: boolean;
  alignTop?: boolean;
}

export const BooleanFormField = ({
  name,
  label,
  subtext,
  onChange,
  disabled,
  noLabel = false,
  alignTop,
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
      <label className="flex space-x-2 text-sm">
        <Checkbox
          id={label}
          checked={field.value}
          onCheckedChange={handleChange}
          disabled={disabled}
          className={`${alignTop ? "mt-1" : "my-auto"}`}
        />

        {!noLabel && (
          <div className="grid leading-none">
            <ShadcnLabel htmlFor={label} className="font-semibold">
              {label}
            </ShadcnLabel>
            {subtext && (
              <p className="text-sm text-muted-foreground">{subtext}</p>
            )}
          </div>
        )}
      </label>

      <ErrorMessage
        name={name}
        component="div"
        className="mt-1 text-sm text-red-500"
      />
    </div>
  );
};

export function MultiSelectField({
  name,
  label,
  subtext,
  options,
  onChange,
  error,
  hideError,
  small,
  selectedInitially,
}: {
  selectedInitially: string[];
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  options: { value: string; label: string }[];
  onChange?: (selected: string[]) => void;
  error?: string;
  hideError?: boolean;
  small?: boolean;
}) {
  const [selectedOptions, setSelectedOptions] =
    useState<string[]>(selectedInitially);

  const handleCheckboxChange = (value: string) => {
    const newSelectedOptions = selectedOptions.includes(value)
      ? selectedOptions.filter((option) => option !== value)
      : [...selectedOptions, value];

    setSelectedOptions(newSelectedOptions);
    if (onChange) {
      onChange(newSelectedOptions);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center gap-x-2">
        <Label small={small}>{label}</Label>
        {error ? (
          <ManualErrorMessage>{error}</ManualErrorMessage>
        ) : (
          !hideError && (
            <ErrorMessage
              name={name}
              component="div"
              className="my-auto text-sm text-error"
            />
          )
        )}
      </div>

      {subtext && <SubLabel>{subtext}</SubLabel>}
      <div className="mt-2">
        {options.map((option) => (
          <label key={option.value} className="flex items-center mb-2">
            {/* <input
              type="checkbox"
              name={name}
              value={option.value}
              checked={selectedOptions.includes(option.value)}
              onChange={() => handleCheckboxChange(option.value)}
              className="mr-2"
            /> */}
            <Checkbox
              name={name}
              value={option.value}
              checked={selectedOptions.includes(option.value)}
              onCheckedChange={() => handleCheckboxChange(option.value)}
              className="mr-2"
            />
            {option.label}
          </label>
        ))}
      </div>
    </div>
  );
}

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

                    <CustomTooltip
                      trigger={
                        <Button variant="ghost" size="icon">
                          <X
                            size={16}
                            onClick={() => arrayHelpers.remove(index)}
                          />
                        </Button>
                      }
                      asChild
                    >
                      Remove
                    </CustomTooltip>
                  </div>
                  <ErrorMessage
                    name={`${name}.${index}`}
                    component="div"
                    className="mt-1 text-sm text-error"
                  />
                </div>
              ))}

            <Button
              onClick={() => {
                arrayHelpers.push("");
              }}
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
  defaultValue?: string;
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
  defaultValue,
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
    <div className="pb-4">
      {label && (
        <ShadcnLabel className="text-sm font-semibold leading-none peer-disabled:cursor-not-allowed">
          {label}
        </ShadcnLabel>
      )}
      {subtext && <SubLabel>{subtext}</SubLabel>}

      <div>
        <Select
          defaultValue={defaultValue}
          value={field.value || ""} // Ensure field.value is reset correctly
          onValueChange={handleSelectChange}
        >
          <SelectTrigger>
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
        className="mt-1 text-sm text-red-500"
      />
    </div>
  );
}
