import React from "react";

interface SwitchProps {
  checked: boolean;
  onChange: () => void;
  label: string;
}

export const Switch: React.FC<SwitchProps> = ({ checked, onChange, label }) => {
  return (
    <label className="flex items-center cursor-pointer">
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
        />
        <div
          className={`block w-14 h-8 rounded-full ${
            checked ? "bg-blue-600" : "bg-gray-600"
          }`}
        ></div>
        <div
          className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition ${
            checked ? "transform translate-x-6" : ""
          }`}
        ></div>
      </div>
      <div className="ml-3 text-gray-700 font-medium">{label}</div>
    </label>
  );
};
