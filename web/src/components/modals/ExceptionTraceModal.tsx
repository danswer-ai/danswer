import { useState } from "react";
import { Modal } from "../Modal";
import { CheckmarkIcon, CopyIcon } from "../icons/icons";
import { CustomModal } from "../CustomModal";
import { Button } from "../ui/button";

export default function ExceptionTraceModal({
  onOutsideClick,
  exceptionTrace,
  isOpen,
}: {
  onOutsideClick: () => void;
  exceptionTrace: string;
  isOpen?: boolean;
}) {
  const [copyClicked, setCopyClicked] = useState(false);

  return (
    <CustomModal
      title="Full Exception Trace"
      onClose={onOutsideClick}
      trigger={null}
      open={isOpen}
    >
      <div className="include-scrollbar pr-3 h-full mb-6">
        <div className="mb-6">
          {!copyClicked ? (
            <Button
              onClick={() => {
                navigator.clipboard.writeText(exceptionTrace!);
                setCopyClicked(true);
                setTimeout(() => setCopyClicked(false), 2000);
              }}
            >
              Copy full trace
              <CopyIcon className="shrink-0 stoke-white" />
            </Button>
          ) : (
            <Button>
              Copied to clipboard
              <CheckmarkIcon className="shrink-0" size={16} />
            </Button>
          )}
        </div>
        <div className="whitespace-pre-wrap">{exceptionTrace}</div>
      </div>
    </CustomModal>
  );
}
