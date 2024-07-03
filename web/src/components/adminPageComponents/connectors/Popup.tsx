"use client";

export interface PopupSpec {
  message: string;
  type: "success" | "error";
}

export const Popup: React.FC<PopupSpec> = ({ message, type }) => (
  <div
    className={`fixed bottom-4 left-4 p-4 rounded-md shadow-lg text-white z-30 ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    }`}
  >
    {message}
  </div>
);