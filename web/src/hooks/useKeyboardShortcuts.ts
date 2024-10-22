import { useEffect } from "react";

type ShortcutHandler = (event: KeyboardEvent) => void;

export const useKeyboardShortcuts = (
  shortcuts: { key: string; handler: ShortcutHandler; ctrlKey?: boolean }[]
) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      shortcuts.forEach(({ key, handler, ctrlKey }) => {
        if (event.key === key && (!ctrlKey || event.ctrlKey)) {
          event.preventDefault();
          handler(event);
        }
      });
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [shortcuts]);
};
