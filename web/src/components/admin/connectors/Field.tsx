import { Button } from "@/components/Button";
import {
  ArrayHelpers,
  ErrorMessage,
  Field,
  FieldArray,
  useField,
  useFormikContext,
} from "formik";
import * as Yup from "yup";
import { FormBodyBuilder } from "./types";
import { FC, useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "@/components/icons/icons";

interface TextFormFieldProps {
  name: string;
  label: string;
  subtext?: string;
  placeholder?: string;
  type?: string;
  disabled?: boolean;
  autoCompleteDisabled?: boolean;
}

export const TextFormField = ({
  name,
  label,
  subtext,
  placeholder,
  type = "text",
  disabled = false,
  autoCompleteDisabled = false,
}: TextFormFieldProps) => {
  return (
    <div className="mb-4">
      <label htmlFor={name} className="block font-medium">
        {label}
      </label>
      {subtext && <p className="text-xs mb-1">{subtext}</p>}
      <Field
        type={type}
        name={name}
        id={name}
        className={
          `
          border 
          text-gray-200 
          border-gray-300 
          rounded 
          w-full 
          py-2 
          px-3 
          mt-1
        ` + (disabled ? " bg-slate-900" : " bg-slate-700")
        }
        disabled={disabled}
        placeholder={placeholder}
        autoComplete={autoCompleteDisabled ? "off" : undefined}
      />
      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
};

interface BooleanFormFieldProps {
  name: string;
  label: string;
  subtext?: string;
}

export const BooleanFormField = ({
  name,
  label,
  subtext,
}: BooleanFormFieldProps) => {
  return (
    <div className="mb-4">
      <label className="flex text-sm">
        <Field name={name} type="checkbox" className="mx-3 px-5" />
        <div>
          <p className="font-medium">{label}</p>
          {subtext && <p className="text-xs">{subtext}</p>}
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
    <div className="mb-4">
      <label htmlFor={name} className="block font-medium">
        {label}
      </label>
      {subtext && <p className="text-xs">{subtext}</p>}

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
                      className="border bg-slate-700 text-gray-200 border-gray-300 rounded w-full py-2 px-3 mr-2"
                      // Disable autocomplete since the browser doesn't know how to handle an array of text fields
                      autoComplete="off"
                    />
                    <Button
                      type="button"
                      onClick={() => arrayHelpers.remove(index)}
                      className="h-8 my-auto"
                    >
                      Remove
                    </Button>
                  </div>
                  <ErrorMessage
                    name={`${name}.${index}`}
                    component="div"
                    className="text-red-500 text-sm mt-1"
                  />
                </div>
              ))}
            <Button
              type="button"
              onClick={() => {
                arrayHelpers.push("");
              }}
              className="mt-3"
            >
              Add New
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
  subtext?: string;
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

interface Option {
  name: string;
  value: string;
  description?: string;
}

interface SelectorFormFieldProps {
  name: string;
  label: string;
  options: Option[];
  subtext?: string;
}

export function SelectorFormField({
  name,
  label,
  options,
  subtext,
}: SelectorFormFieldProps) {
  const [field] = useField<string>(name);
  const { setFieldValue } = useFormikContext();

  return (
    <div className="mb-4">
      <label className="flex mb-2">
        <div>
          {label}
          {subtext && <p className="text-xs">{subtext}</p>}
        </div>
      </label>

      <Dropdown
        options={options}
        selected={field.value}
        onSelect={(selected) => setFieldValue(name, selected.value)}
      />

      <ErrorMessage
        name={name}
        component="div"
        className="text-red-500 text-sm mt-1"
      />
    </div>
  );
}

interface DropdownProps {
  options: Option[];
  selected: string;
  onSelect: (selected: Option) => void;
}

const Dropdown: FC<DropdownProps> = ({ options, selected, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedName = options.find(
    (option) => option.value === selected
  )?.name;

  const handleSelect = (option: Option) => {
    onSelect(option);
    setIsOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div className="relative inline-block text-left w-full" ref={dropdownRef}>
      <div>
        <button
          type="button"
          className={`inline-flex 
          justify-center 
          w-full 
          px-4 
          py-3
          text-sm 
          bg-gray-700 
          border 
          border-gray-300 
          rounded-md 
          shadow-sm 
          hover:bg-gray-700 
          focus:ring focus:ring-offset-0 focus:ring-1 focus:ring-offset-gray-800 focus:ring-blue-800
          `}
          id="options-menu"
          aria-expanded="true"
          aria-haspopup="true"
          onClick={() => setIsOpen(!isOpen)}
        >
          {selectedName ? <p>{selectedName}</p> : "Select an option..."}
          <ChevronDownIcon className="text-gray-400 my-auto ml-auto" />
        </button>
      </div>

      {isOpen ? (
        <div className="origin-top-right absolute left-0 mt-3 w-full rounded-md shadow-lg bg-gray-700 border-2 border-gray-600">
          <div
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="options-menu"
          >
            {options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelect(option)}
                className={
                  `w-full text-left block px-4 py-2.5 text-sm hover:bg-gray-800` +
                  (index !== 0 ? " border-t-2 border-gray-600" : "")
                }
                role="menuitem"
              >
                <p className="font-medium">{option.name}</p>
                {option.description && (
                  <div>
                    <p className="text-xs text-gray-300">
                      {option.description}
                    </p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
};
