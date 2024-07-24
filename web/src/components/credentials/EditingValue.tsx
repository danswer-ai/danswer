import { useState } from "react";
import {
  BooleanFormField,
  Label,
  SubLabel,
  TextFormField,
} from "../admin/connectors/Field";
import { EditIcon } from "../icons/icons";
import { CustomCheckbox } from "../CustomCheckbox";
import { AdminBooleanFormField, AdminTextField } from "./fields";
import { ErrorMessage, Field } from "formik";

export const EditingValue: React.FC<{
  setFieldValue: (field: string, value: any) => void;
  name: string;
  currentValue?: any;
  label: string;
  type?: string;
  includRevert?: boolean;
  className?: string;
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
  optional,
  onChange,
  onChangeBool,
  onChangeDate,
}) => {
  const [value, setValue] = useState<boolean | string | number | Date>();

  const updateValue = (newValue: string | boolean | number | Date) => {
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
                checked={value as boolean}
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
                  currentValue instanceof Date
                    ? currentValue.toISOString().split("T")[0]
                    : ""
                }
                placeholder={currentValue}
                onChange={(e) => {
                  const dateValue = e.target.value
                    ? new Date(e.target.value)
                    : null;
                  if (dateValue) {
                    updateValue(dateValue);
                  }
                  if (onChangeDate) {

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
          ) : type === "number" ? (
            <>
              <label className="block text-sm font-medium text-neutral-700 mb-1">
                {label}
                {optional && (
                  <span className="text-neutral-500 ml-1">(optional)</span>
                )}
              </label>
              {description && <SubLabel>{description}</SubLabel>}

              <input
                type="number"
                name={name}
                value={value as number}
                placeholder={currentValue}
                onChange={(e) => {
                  const value = parseInt(e.target.value);
                  updateValue(value);
                  console.log(value);
                  if (onChangeNumber) {
                    onChangeNumber(value);
                  }
                }}
                className="mt-2 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md text-sm shadow-sm placeholder-gray-400
                    focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500
                    disabled:bg-gray-50 disabled:text-gray-500 disabled:border-gray-200 disabled:shadow-none
                    invalid:border-pink-500 invalid:text-pink-600
                    focus:invalid:border-pink-500 focus:invalid:ring-pink-500"
              />
            </>
          ) : (
            // <AdminTextField
            //   optional={optional}
            //   noPadding
            //   description={description}
            //   onChange={(e) => {
            //     updateValue(e.target.value);
            //     if (onChange) {
            //       onChange(e.target.value!);
            //     }
            //     if (onChangeNumber) {
            //       onChangeNumber(parseInt(e.target.value)!);
            //     }
            //   }}
            //   type={type}
            //   name={name}
            //   placeholder={currentValue}
            //   label={label}
            // />
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
