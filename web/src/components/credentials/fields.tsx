import { Button } from "@tremor/react";
import {
  ArrayHelpers,
  ErrorMessage,
  Field,
  FieldArray,
  useField,
  useFormikContext,
} from "formik";
import * as Yup from "yup";

import {
  ExplanationText,
  Label,
  ManualErrorMessage,
  SubLabel,
  ToolTipDetails,
} from "../admin/connectors/Field";
import CredentialSubText from "./CredentialSubText";

export function AdminTextField({
  name,
  label,
  subtext,
  placeholder,
  onChange,
  description,
  type = "text",
  isTextArea = false,
  disabled = false,
  autoCompleteDisabled = true,
  error,
  defaultHeight,
  isCode = false,
  fontSize,
  hideError,
  tooltip,
  explanationText,
  explanationLink,
  small,
  value,
  noPadding,
  removeLabel,
  optional,
}: {
  description?: string;
  name: string;
  value?: string;
  removeLabel?: boolean;
  label: string;
  subtext?: string | JSX.Element;
  placeholder?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: string;
  isTextArea?: boolean;
  disabled?: boolean;
  noPadding?: boolean;
  autoCompleteDisabled?: boolean;
  error?: string;
  defaultHeight?: string;
  isCode?: boolean;
  fontSize?: "text-sm" | "text-base" | "text-lg";
  hideError?: boolean;
  tooltip?: string;
  explanationText?: string;
  explanationLink?: string;
  small?: boolean;
  optional?: boolean;
}) {
  let heightString = defaultHeight || "";
  if (isTextArea && !heightString) {
    heightString = "h-28";
  }

  return (
    <div className={`${!noPadding && "mb-6"}`}>
      <div className="flex gap-x-2 items-center">
        {!removeLabel && (
          <label
            htmlFor={name}
            className="block text-sm font-medium text-neutral-700"
          >
            {label}
            {optional && (
              <span className="text-neutral-500 ml-1">(optional)</span>
            )}
          </label>
        )}
        {tooltip && <ToolTipDetails>{tooltip}</ToolTipDetails>}
        {error ? (
          <ManualErrorMessage>{error}</ManualErrorMessage>
        ) : (
          !hideError && (
            <ErrorMessage
              name={name}
              component="div"
              className="text-error my-auto text-sm"
            />
          )
        )}
      </div>
      {description && <CredentialSubText>{description}</CredentialSubText>}

      {subtext && <SubLabel>{subtext}</SubLabel>}

      <Field
        as={isTextArea ? "textarea" : "input"}
        type={type}
        name={name}
        id={name}
        className={`
                ${small && "text-sm"}
                border 
                border-border 
                rounded 
                w-full 
                py-2 
                px-3 
                mt-1
                ${heightString}
                ${fontSize}
                ${isCode ? " font-mono" : ""}
          `}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoCompleteDisabled ? "off" : undefined}
        {...(onChange ? { onChange } : {})}
      />

      {explanationText && (
        <ExplanationText link={explanationLink} text={explanationText} />
      )}
    </div>
  );
}
