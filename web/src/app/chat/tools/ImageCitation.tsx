import { PopupSpec } from "@/components/admin/connectors/Popup";
import { CopyIcon } from "@/components/icons/icons";
import { Separator } from "@/components/ui/separator";
import React, { useState } from "react";
import { FiCheck } from "react-icons/fi";

interface PromptSectionProps {
  prompt: string;
  arg: string;
  index: number;
  copied: number | null;
  onCopy: (text: string, index: number) => void;
}

const PromptSection: React.FC<PromptSectionProps> = ({
  prompt,
  arg,
  index,
  copied,
  onCopy,
}) => (
  <div className="w-full p-2 rounded-lg">
    <h2 className="text-lg font-semibold mb-2">
      {arg} {index + 1}
    </h2>
    <p className="line-clamp-6 text-sm text-gray-800">{prompt}</p>
    <button
      onMouseDown={() => onCopy(prompt, index)}
      className="flex mt-2 text-sm cursor-pointer items-center justify-center py-2 px-3 border border-background-200 bg-inverted text-text-900 rounded-full hover:bg-background-100 transition duration-200"
    >
      {copied === index ? (
        <>
          <FiCheck className="mr-2" size={16} />
          Copied!
        </>
      ) : (
        <>
          <CopyIcon className="mr-2" size={16} />
          Copy
        </>
      )}
    </button>
  </div>
);

interface DualPromptDisplayProps {
  prompts: string[];
  arg: string;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

const DualPromptDisplay: React.FC<DualPromptDisplayProps> = ({
  prompts,
  arg,
  setPopup,
}) => {
  const [copied, setCopied] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setPopup({ message: "Copied to clipboard", type: "success" });
        setCopied(index);
        setTimeout(() => setCopied(null), 2000);
      })
      .catch(() => {
        setPopup({ message: "Failed to copy", type: "error" });
      });
  };

  return (
    <div className="w-full bg-inverted mx-auto rounded-lg">
      <div className="flex flex-col gap-x-4">
        {prompts.map((prompt, index) => (
          <React.Fragment key={index}>
            {index > 0 && <Separator />}
            <PromptSection
              prompt={prompt}
              arg={arg}
              index={index}
              copied={copied}
              onCopy={copyToClipboard}
            />
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default DualPromptDisplay;
