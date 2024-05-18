import React, { useRef } from "react";
import { FiSend, FiStopCircle } from "react-icons/fi";

interface ChatInputBarProps {
  message: string;
  setMessage: (message: string) => void;
  onSubmit: () => void;
  isStreaming: boolean;
  setIsCancelled: (value: boolean) => void;
}

const ChatInputBar = ({
  message,
  setMessage,
  onSubmit,
  isStreaming,
  setIsCancelled,
}: ChatInputBarProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <div className="flex justify-center py-2 max-w-screen-lg mx-auto mb-2">
      <div
        className="
        w-full
        shrink
        relative
        px-4
        w-searchbar-xs
        2xl:w-searchbar-sm
        3xl:w-searchbar
        mx-auto
      "
      >
        <div
          className={`
            opacity-100
            w-full
            h-fit
            flex
            flex-col
            border
            border-border
            rounded-lg
            [&:has(textarea:focus)]::ring-1
            [&:has(textarea:focus)]::ring-black
          `}
        >
          <textarea
            ref={textareaRef}
            className={`m-0
                        w-full
                        shrink
                        resize-none
                        border-0
                        bg-transparent
                        ${
                          textareaRef.current &&
                          textareaRef.current.scrollHeight > 200
                            ? "overflow-y-auto"
                            : ""
                        }
                        whitespace-normal
                        break-word
                        overscroll-contain
                        outline-none
                        placeholder-gray-400
                        overflow-hidden
                        resize-none
                        pl-4
                        pr-12
                        py-4
                        h-14`}
            autoFocus
            style={{ scrollbarWidth: "thin" }}
            role="textarea"
            aria-multiline
            placeholder="Ask me anything..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.shiftKey &&
                message &&
                !isStreaming
              ) {
                onSubmit();
                event.preventDefault();
              }
            }}
            suppressContentEditableWarning={true}
          />
        </div>
        <div className="absolute bottom-2.5 right-10">
          <div
            className="cursor-pointer"
            onClick={() => {
              if (!isStreaming) {
                if (message) {
                  onSubmit();
                }
              } else {
                setIsCancelled(true);
              }
            }}
          >
            {isStreaming ? (
              <FiStopCircle
                size={18}
                className="text-emphasis w-9 h-9 p-2 rounded-lg hover:bg-hover"
              />
            ) : (
              <FiSend
                size={18}
                className={`text-emphasis w-9 h-9 p-2 rounded-lg ${
                  message ? "bg-blue-200" : ""
                }`}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInputBar;
