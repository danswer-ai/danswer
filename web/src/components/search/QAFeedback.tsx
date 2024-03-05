import { useState } from "react";
import { PopupSpec } from "../admin/connectors/Popup";
import { ThumbsDownIcon, ThumbsUpIcon } from "../icons/icons";

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
  setPopup: (popupSpec: PopupSpec | null) => void;
  feedbackType: Feedback;
}

const QAFeedback = ({
  messageId,
  setPopup,
  feedbackType,
}: QAFeedbackIconProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const size = isHovered ? 22 : 20;
  const paddingY = isHovered ? "" : "py-0.5 ";

  return (
    <div
      onClick={async () => {
        const isSuccessful = await giveFeedback(messageId, feedbackType);
        if (isSuccessful) {
          setPopup({
            message: "Thanks for your feedback!",
            type: "success",
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
  setPopup: (popupSpec: PopupSpec | null) => void;
}

export const QAFeedbackBlock = ({
  messageId,
  setPopup,
}: QAFeedbackBlockProps) => {
  return (
    <div className="flex">
      <QAFeedback
        messageId={messageId}
        setPopup={setPopup}
        feedbackType="like"
      />
      <div className="ml-2">
        <QAFeedback
          messageId={messageId}
          setPopup={setPopup}
          feedbackType="dislike"
        />
      </div>
    </div>
  );
};
