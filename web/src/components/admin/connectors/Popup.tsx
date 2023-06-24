import { useState } from "react";

export interface PopupSpec {
  message: string;
  type: "success" | "error";
}

export const Popup: React.FC<PopupSpec> = ({ message, type }) => (
  <div
    className={`fixed bottom-4 left-4 p-4 rounded-md shadow-lg text-white ${
      type === "success" ? "bg-green-500" : "bg-red-500"
    }`}
  >
    {message}
  </div>
);

export const usePopup = () => {
  const [popup, setPopup] = useState<PopupSpec | null>(null);
  const setPopupWithExpiration = (popupSpec: PopupSpec | null) => {
    setPopup(popupSpec);
    setTimeout(() => {
      setPopup(null);
    }, 4000);
  };

  return {
    popup: popup && <Popup {...popup} />,
    setPopup: setPopupWithExpiration,
  };
};
