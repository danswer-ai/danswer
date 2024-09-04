import { useState } from "react";
import { PopupSpec } from "../admin/connectors/Popup";
import { ThumbsDownIcon, ThumbsUpIcon } from "../icons/icons";
import { useToast } from "@/hooks/use-toast";

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
  const [isHovered, setIsHovered] = useState(false);
  const { toast } = useToast();

  const size = isHovered ? 22 : 20;
  const paddingY = isHovered ? "" : "py-0.5 ";

  return (
    <div
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
      onMouseEnter={() => {
        setIsHovered(true);
      }}
      onMouseLeave={() => setIsHovered(false)}
      className={"cursor-pointer " + paddingY}
    >
      {feedbackType === "like" ? (
        <ThumbsUpIcon
          size={size}
          className="my-auto flex flex-shrink-0 text-gray-500"
        />
      ) : (
        <ThumbsDownIcon
          size={size}
          className="my-auto flex flex-shrink-0 text-gray-500"
        />
      )}
    </div>
  );
};

interface QAFeedbackBlockProps {
  messageId: number;
}

export const QAFeedbackBlock = ({ messageId }: QAFeedbackBlockProps) => {
  return (
    <div className="flex">
      <QAFeedback messageId={messageId} feedbackType="like" />
      <div className="ml-2">
        <QAFeedback messageId={messageId} feedbackType="dislike" />
      </div>
    </div>
  );
};
