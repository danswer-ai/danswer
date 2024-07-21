import { useState } from "react";
import {
  BooleanFormField,
  Label,
  SubLabel,
  TextFormField,
} from "../admin/connectors/Field";
import { EditIcon } from "../icons/icons";
import { CustomCheckbox } from "../CustomCheckbox";
import { AdminTextField } from "./fields";
import { ErrorMessage, Field } from "formik";

export const EditingValue: React.FC<{
  setFieldValue: (
    field: string,
    value: any,
    shouldValidate?: boolean
  ) => Promise<any>;
  name: string;
  currentValue: string;
  label: string;
  type?: string;
  includRevert?: boolean;
  className?: string;
  removeLabel?: boolean;
  optional?: boolean;
  description?: string;
}> = ({
  setFieldValue,
  name,
  currentValue,
  label,
  type,
  includRevert,
  className,
  description,
  removeLabel,
  optional,
}) => {
  const [value, setValue] = useState(currentValue);

  const updateValue = (newValue: string | boolean) => {
    setValue(newValue.toString());
    setFieldValue(name, newValue);
  };

  return (
    <div className="flex text-neutral-800 flex-col">
      <div className={`w-full flex gap-x-2 justify-between ${className}`}>
        <div className="text-sm w-full">
          {type === "checkbox" ? (
            <div className="flex items-center">
              <AdminBooleanFormField
                subtext={description}
                onChange={(e) => e.target.value}
                name={name}
                label={label}
              />
            </div>
          ) : (
            <AdminTextField
              optional={optional}
              noPadding
              description={description}
              onChange={(e) => updateValue(e.target.value)}
              value={value}
              type={type}
              name={name}
              placeholder={currentValue}
              label={label}
            />
          )}
        </div>
        {includRevert && (
          <div className="flex-none mt-auto">
            <button
              className="text-xs h-[35px] my-auto p-1.5 rounded bg-neutral-900 border-neutral-700 text-neutral-300 flex gap-x-1"
              onClick={(e) => {
                updateValue("");
                e.preventDefault();
              }}
            >
              <EditIcon className="text-netural-300 my-auto" />
              <p className="my-auto">Revert</p>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

interface BooleanFormFieldProps {
  name: string;
  label: string;
  subtext?: string | JSX.Element;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  small?: boolean;
  alignTop?: boolean;
  noLabel?: boolean;
}

export const AdminBooleanFormField = ({
  name,
  label,
  subtext,
  onChange,
  noLabel,
  small,
  alignTop,
}: BooleanFormFieldProps) => {
  return (
    <div className="mb-4">
      <label className="flex text-sm">
        <Field
          name={name}
          type="checkbox"
          className={`mr-3 bg-white px-5 w-3.5 h-3.5 ${
            alignTop ? "mt-1" : "my-auto"
          }`}
          {...(onChange ? { onChange } : {})}
        />
        {!noLabel && (
          <div>
            <Label small={small}>{label}</Label>
            {subtext && <SubLabel>{subtext}</SubLabel>}
          </div>
        )}
      </label>
    </div>
  );
};
