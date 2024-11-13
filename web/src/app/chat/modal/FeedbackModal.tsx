"use client";

import { useState } from "react";
import { FeedbackType } from "../types";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
  onClose?: () => void;
  onSubmit?: (
    messageId: number,
    feedbackType: FeedbackType,
    feedbackDetails: string,
    predefinedFeedback: string | undefined
  ) => Promise<void>;
  onModalClose: () => void;
  currentFeedback?: [FeedbackType, number] | null;
}

export const FeedbackModal = ({
  feedbackType,
  onClose,
  onSubmit,
  onModalClose,
  currentFeedback,
}: FeedbackModalProps) => {
  const [message, setMessage] = useState("");
  const [predefinedFeedback, setPredefinedFeedback] = useState<
    string | undefined
  >();

  const handlePredefinedFeedback = (feedback: string) => {
    setPredefinedFeedback(feedback);
  };

  const predefinedFeedbackOptions =
    feedbackType === "like"
      ? predefinedPositiveFeedbackOptions
      : predefinedNegativeFeedbackOptions;

  const handleSubmit = () => {
    if (onSubmit && currentFeedback) {
      onSubmit(
        currentFeedback[1],
        currentFeedback[0],
        message,
        predefinedFeedback
      );
      setMessage("");
      setPredefinedFeedback(undefined);
      onModalClose();
      if (onClose) {
        onClose();
      }
    }
  };

  return (
    <div className="space-y-4">
      <Textarea
        autoFocus
        role="textarea"
        aria-multiline
        placeholder={
          feedbackType === "like"
            ? "(Optional) What did you like about this response?"
            : "(Optional) What was the issue with the response? How could it be improved?"
        }
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        className="min-h-40"
      />
      {predefinedFeedbackOptions && (
        <RadioGroup>
          {predefinedFeedbackOptions.map((feedback, index) => (
            <div
              key={index}
              className="flex items-center space-x-2"
              onClick={() => handlePredefinedFeedback(feedback)}
            >
              <RadioGroupItem value={feedback} id={feedback} />
              <Label htmlFor={feedback}>{feedback}</Label>
            </div>
          ))}
        </RadioGroup>
      )}

      <div className="w-full flex justify-end gap-2">
        <Button onClick={onModalClose} variant="ghost">
          Cancel
        </Button>
        <Button onClick={handleSubmit}>Submit feedback</Button>
      </div>
    </div>
  );
};
