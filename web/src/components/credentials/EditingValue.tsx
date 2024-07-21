import { useState } from "react";
import { TextFormField } from "../admin/connectors/Field";
import { EditIcon } from "../icons/icons";

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
}> = ({
  setFieldValue,
  name,
  currentValue,
  label,
  type,
  includRevert,
  className,
}) => {
  const [value, setValue] = useState("");
  const updateValue = (newValue: string) => {
    setValue(newValue);
    setFieldValue(name, newValue);
  };

  return (
    <div className={`w-full flex gap-x-2 justify-between ${className}`}>
      <div className="w-full">
        <TextFormField
          noPadding
          onChange={(e) => updateValue(e.target.value)}
          value={value}
          type={type}
          name={name}
          placeholder={currentValue}
          label={label}
        />
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
  );
};
