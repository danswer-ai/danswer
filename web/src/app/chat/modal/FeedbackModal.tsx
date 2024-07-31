"use client";

import { useState } from "react";
import { FeedbackType } from "../types";
import { FiThumbsDown, FiThumbsUp } from "react-icons/fi";
import { ModalWrapper } from "./ModalWrapper";
import { Button } from "@tremor/react";

const predefinedPositiveFeedbackOptions =
  process.env.NEXT_PUBLIC_POSITIVE_PREDEFINED_FEEDBACK_OPTIONS?.split(",") ||
  [];
const predefinedNegativeFeedbackOptions =
  process.env.NEXT_PUBLIC_NEGATIVE_PREDEFINED_FEEDBACK_OPTIONS?.split(",") || [
    "Retrieved documents were not relevant",
    "AI misread the documents",
    "Cited source had incorrect information",
  ];

interface FeedbackModalProps {
  feedbackType: FeedbackType;
  onClose: () => void;
  onSubmit: (feedbackDetails: {
    message: string;
    predefinedFeedback?: string;
  }) => void;
}

export const FeedbackModal = ({
  feedbackType,
  onClose,
  onSubmit,
}: FeedbackModalProps) => {
  const [message, setMessage] = useState("");
  const [predefinedFeedback, setPredefinedFeedback] = useState<
    string | undefined
  >();

  const handlePredefinedFeedback = (feedback: string) => {
    setPredefinedFeedback(feedback);
  };

  const handleSubmit = () => {
    onSubmit({ message, predefinedFeedback });
    onClose();
  };

  const predefinedFeedbackOptions =
    feedbackType === "like"
      ? predefinedPositiveFeedbackOptions
      : predefinedNegativeFeedbackOptions;

  return (
    <ModalWrapper onClose={onClose} modalClassName="max-w-5xl">
      <>
        <h2 className="flex mb-4 text-2xl font-bold text-emphasis">
          <div className="my-auto mr-1">
            {feedbackType === "like" ? (
              <FiThumbsUp className="my-auto mr-2 text-green-500" />
            ) : (
              <FiThumbsDown className="my-auto mr-2 text-red-600" />
            )}
          </div>
          Provide additional feedback
        </h2>
        <div className="flex flex-wrap justify-start mb-4">
          {predefinedFeedbackOptions.map((feedback, index) => (
            <button
              key={index}
              className={`bg-border hover:bg-hover text-default py-2 px-4 rounded m-1 
                ${predefinedFeedback === feedback && "ring-2 ring-accent"}`}
              onClick={() => handlePredefinedFeedback(feedback)}
            >
              {feedback}
            </button>
          ))}
        </div>
        <textarea
          autoFocus
          className={`
            w-full flex-grow 
            border border-border-strong rounded 
            outline-none placeholder-subtle 
            pl-4 pr-4 py-4 bg-background 
            overflow-hidden h-28 
            whitespace-normal resize-none 
            break-all overscroll-contain
          `}
          role="textarea"
          aria-multiline
          placeholder={
            feedbackType === "like"
              ? "(Optional) What did you like about this response?"
              : "(Optional) What was the issue with the response? How could it be improved?"
          }
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="flex mt-2">
          <Button className="mx-auto mt-4" onClick={handleSubmit}>
            Submit feedback
          </Button>
        </div>
      </>
    </ModalWrapper>
  );
};
