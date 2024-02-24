"use client";

import { useState } from "react";
import { FeedbackType } from "../types";
import { FiThumbsDown, FiThumbsUp } from "react-icons/fi";
import { ModalWrapper } from "./ModalWrapper";

interface FeedbackModalProps {
  feedbackType: FeedbackType;
  onClose: () => void;
  onSubmit: (feedbackDetails: string) => void;
}

export const FeedbackModal = ({
  feedbackType,
  onClose,
  onSubmit,
}: FeedbackModalProps) => {
  const [message, setMessage] = useState("");

  return (
    <ModalWrapper onClose={onClose} modalClassName="max-w-5xl">
      <>
        <h2 className="text-2xl text-emphasis font-bold mb-4 flex">
          <div className="mr-1 my-auto">
            {feedbackType === "like" ? (
              <FiThumbsUp className="text-green-500 my-auto mr-2" />
            ) : (
              <FiThumbsDown className="text-red-600 my-auto mr-2" />
            )}
          </div>
          Provide additional feedback
        </h2>
        <textarea
          autoFocus
          className={`
              w-full
              flex-grow 
              ml-2 
              border 
              border-border-strong
              rounded 
              outline-none 
              placeholder-subtle 
              pl-4 
              pr-14 
              py-4 
              bg-background 
              overflow-hidden
              h-28
              whitespace-normal 
              resize-none
              break-all
              overscroll-contain`}
          role="textarea"
          aria-multiline
          placeholder={
            feedbackType === "like"
              ? "What did you like about this response?"
              : "What was the issue with the response? How could it be improved?"
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              onSubmit(message);
              event.preventDefault();
            }
          }}
          suppressContentEditableWarning={true}
        />

        <div className="flex mt-2">
          <button
            className="bg-accent text-white py-2 px-4 rounded hover:bg-blue-600 focus:outline-none mx-auto"
            onClick={() => onSubmit(message)}
          >
            Submit feedback
          </button>
        </div>
      </>
    </ModalWrapper>
  );
};
