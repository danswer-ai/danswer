import { PopupSpec } from "@/components/adminPageComponents/connectors/Popup";
import { Popup } from "@/components/adminPageComponents/connectors/Popup";
import React from "react";
import { useRef, useState } from "react";

export const usePopup = () => {
    const [popup, setPopup] = useState<PopupSpec | null>(null);
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
    const setPopupWithExpiration = (popupSpec: PopupSpec | null) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
  
      setPopup(popupSpec);
      timeoutRef.current = setTimeout(() => {
        setPopup(null);
      }, 4000);
    };
  
    return {
      popup: popup && React.createElement(Popup, {...popup}),
      setPopup: setPopupWithExpiration,
    };
  };
  