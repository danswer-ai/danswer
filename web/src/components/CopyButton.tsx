import { useState } from "react";
import { Button } from "./ui/button";
import { Check, Copy } from "lucide-react";

export function CopyButton({
  content,
  onClick,
}: {
  content?: string;
  onClick?: () => void;
}) {
  const [copyClicked, setCopyClicked] = useState(false);

  return (
    <Button
      onClick={() => {
        if (content) {
          navigator.clipboard.writeText(content.toString());
        }
        onClick && onClick();

        setCopyClicked(true);
        setTimeout(() => setCopyClicked(false), 3000);
      }}
      variant="ghost"
      size="xs"
    >
      {copyClicked ? <Check size={16} /> : <Copy size={16} />}
    </Button>
  );
}
