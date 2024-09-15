import { PopupSpec } from "@/components/admin/connectors/Popup";
import { CopyIcon } from "@/components/icons/icons";
import { Divider } from "@tremor/react";
import React, { forwardRef, useState } from "react";
import { FiCheck } from "react-icons/fi";

interface PromptDisplayProps {
  prompt1: string;
  prompt2?: string;
  arg: string;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

const DualPromptDisplay = forwardRef<HTMLDivElement, PromptDisplayProps>(
  ({ prompt1, prompt2, setPopup, arg }, ref) => {
    const [copied, setCopied] = useState<number | null>(null);

    const copyToClipboard = (text: string, index: number) => {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setPopup({ message: "Copied to clipboard", type: "success" });
          setCopied(index);
          setTimeout(() => setCopied(null), 2000); // Reset copy status after 2 seconds
        })
        .catch((err) => {
          setPopup({ message: "Failed to copy", type: "error" });
        });
    };

    const PromptSection = ({
      copied,
      prompt,
      index,
    }: {
      copied: number | null;
      prompt: string;
      index: number;
    }) => (
      <div className="w-full p-2 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">
          {arg} {index + 1}
        </h2>

        <p className="line-clamp-6 text-sm text-gray-800">{prompt}</p>

        <button
          onMouseDown={() => copyToClipboard(prompt, index)}
          className="flex mt-2 text-sm cursor-pointer items-center justify-center py-2 px-3 border border-background-200 bg-inverted text-text-900 rounded-full hover:bg-background-100 transition duration-200"
        >
          {copied == index ? (
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

    return (
      <div className="w-[400px] bg-inverted mx-auto p-6 rounded-lg shadow-lg">
        <div className="flex flex-col gap-x-4">
          <PromptSection copied={copied} prompt={prompt1} index={0} />
          {prompt2 && (
            <>
              <Divider />
              <PromptSection copied={copied} prompt={prompt2} index={1} />
            </>
          )}
        </div>
      </div>
    );
  }
);

DualPromptDisplay.displayName = "DualPromptDisplay";
export default DualPromptDisplay;
