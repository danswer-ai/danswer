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
  const [isCopyClicked, setIsCopyClicked] = useState(false);

  return (
    <CustomTooltip
      trigger={
        <Button
          onClick={() => {
            if (content) {
              navigator.clipboard.writeText(content.toString());
            }
            onClick && onClick();

            setIsCopyClicked(true);
            setTimeout(() => setIsCopyClicked(false), 3000);
          }}
          variant="ghost"
          size="smallIcon"
        >
          {isCopyClicked ? <Check size={16} /> : <Copy size={16} />}
        </Button>
      }
    >
      {isCopyClicked ? "Copied" : "Copy"}
    </CustomTooltip>
  );
}
