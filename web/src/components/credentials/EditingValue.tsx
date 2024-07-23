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
  setFieldValue: (field: string, value: any) => void;
  name: string;
  currentValue?: any;
  label: string;
  type?: string;
  includRevert?: boolean;
  className?: string;
  removeLabel?: boolean;
  optional?: boolean;
  description?: string;
  onChange?: (value: string) => void;
  onChangeBool?: (value: boolean) => void;
  onChangeNumber?: (value: number) => void;
  onChangeDate?: (value: Date | null) => void;
}> = ({
  setFieldValue,
  onChangeNumber,
  name,
  currentValue,
  label,
  type,
  includRevert,
  className,
  description,
  removeLabel,
  optional,
  onChange,
  onChangeBool,
  onChangeDate,
}) => {
  const [value, setValue] = useState(currentValue);

  const updateValue = (newValue: string | boolean | Date) => {
    setValue(newValue);
    setFieldValue(name, newValue);
  };

  return (
    <div className="flex text-neutral-800 flex-col">
      <div className={`w-full flex gap-x-2 justify-between ${className}`}>
        <div className="text-sm w-full">
          {type === "checkbox" ? (
            <div className="flex items-center">
              <AdminBooleanFormField
                checked={value}
                subtext={description}
                onChange={() => {
                  updateValue(!(value as boolean));
                  if (onChangeBool) {
                    onChangeBool(!value);
                  }
                }}
                name={name}
                label={label}
              />
            </div>
          ) : type === "date" ? (
            <div>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {label}
                {optional && (
                  <span className="text-neutral-500 ml-1">(optional)</span>
                )}
              </label>
              {description && <SubLabel>{description}</SubLabel>}

              <input
                type="date"
                name={name}
                value={
                  value instanceof Date ? value.toISOString().split("T")[0] : ""
                }
                onChange={(e) => {
                  const dateValue = e.target.value
                    ? new Date(e.target.value)
                    : null;
                  if (dateValue) {
                    updateValue(dateValue);
                  }
                  console.log(dateValue);
                  if (onChangeDate) {
                    console.log("CHANGING THE DSATE");

                    onChangeDate(dateValue);
                  }
                }}
                className="mt-2 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                    focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
                    disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 disabled:shadow-none
                    invalid:border-pink-500 invalid:text-pink-600
                    focus:invalid:border-pink-500 focus:invalid:ring-pink-500"
              />
            </div>
          ) : (
            <AdminTextField
              optional={optional}
              noPadding
              description={description}
              onChange={(e) => {
                updateValue(e.target.value);
                if (onChange) {
                  onChange(e.target.value!);
                }
                if (onChangeNumber) {
                  onChangeNumber(parseInt(e.target.value)!);
                }
              }}
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
  checked: boolean;
}

export const AdminBooleanFormField = ({
  name,
  label,
  subtext,
  onChange,
  noLabel,
  small,
  checked,
  alignTop,
}: BooleanFormFieldProps) => {
  return (
    <div>
      <label className="flex text-sm">
        <Field
          name={name}
          checked={checked}
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
