import { useState } from "react";
import { Button } from "./ui/button";
import { Check, Copy } from "lucide-react";
import { CustomTooltip } from "./CustomTooltip";

export function CopyButton({
  content,
  onClick,
}: {
  content?: string;
  onClick?: () => void;
}) {
  const [copyClicked, setCopyClicked] = useState(false);

  return (
    <CustomTooltip
      trigger={
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
          size="smallIcon"
        >
          {copyClicked ? <Check size={16} /> : <Copy size={16} />}
        </Button>
      }
    >
      {copyClicked ? "Copied" : "Copy"}
    </CustomTooltip>
  );
}
