import { useState } from "react";
import { PopupSpec } from "../admin/connectors/Popup";
import { ThumbsDownIcon, ThumbsUpIcon } from "../icons/icons";
import { useToast } from "@/hooks/use-toast";
import { Button } from "../ui/button";
import { CustomTooltip } from "../CustomTooltip";

type Feedback = "like" | "dislike";

const giveFeedback = async (
  messageId: number,
  feedback: Feedback
): Promise<boolean> => {
  const response = await fetch("/api/chat/create-chat-message-feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_message_id: messageId,
      is_positive: feedback === "like",
    }),
  });
  return response.ok;
};

interface QAFeedbackIconProps {
  messageId: number;
  feedbackType: Feedback;
}

const QAFeedback = ({ messageId, feedbackType }: QAFeedbackIconProps) => {
  const { toast } = useToast();

  return (
    <CustomTooltip
      trigger={
        <Button
          variant="ghost"
          size="icon"
          onClick={async () => {
            const isSuccessful = await giveFeedback(messageId, feedbackType);
            if (isSuccessful) {
              toast({
                title: "Success",
                description: "Thanks for your feedback!",
                variant: "success",
              });
            }
          }}
          className="cursor-pointer"
        >
          {feedbackType === "like" ? (
            <ThumbsUpIcon size={16} />
          ) : (
            <ThumbsDownIcon size={16} />
          )}
        </Button>
      }
      asChild
    >
      {feedbackType === "like" ? "Like" : "Dislike"}
    </CustomTooltip>
  );
};

interface QAFeedbackBlockProps {
  messageId: number;
}

export const QAFeedbackBlock = ({ messageId }: QAFeedbackBlockProps) => {
  return (
    <div className="flex">
      <QAFeedback messageId={messageId} feedbackType="like" />
      <QAFeedback messageId={messageId} feedbackType="dislike" />
    </div>
  );
};
