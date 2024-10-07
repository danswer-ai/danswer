import { useEffect } from "react";

import { usePopup } from "../admin/connectors/Popup";
import { PopupSpec } from "../admin/connectors/Popup";
import { useRouter } from "next/navigation";

interface PopupMessages {
  [key: string]: PopupSpec;
}

export const usePopupFromQuery = (messages: PopupMessages) => {
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    // Get the value for search param with key "message"
    const messageValue = searchParams.get("message");
    // Check if any key from messages object is present in search params
    for (const key in messages) {
      if (messageValue === key) {
        const popupMessage = messages[key];
        console.log("popupMessage", popupMessage);
        const newUrl = `${window.location.pathname}`;
        router.replace(newUrl);
        setPopup(popupMessage);

        // Exit the loop after handling the first match
        break;
      }
    }
  }, []);

  return { popup };
};
