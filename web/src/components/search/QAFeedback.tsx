import { useState } from "react";
import { PopupSpec } from "../admin/connectors/Popup";
import { ThumbsDownIcon, ThumbsUpIcon } from "../icons/icons";

type Feedback = "like" | "dislike";

const giveFeedback = async (
  queryId: number,
  feedback: Feedback
): Promise<boolean> => {
  const response = await fetch("/api/query-feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query_id: queryId,
      feedback,
    }),
  });
  return response.ok;
};

interface QAFeedbackIconProps {
  queryId: number;
  setPopup: (popupSpec: PopupSpec | null) => void;
  feedbackType: Feedback;
}

const QAFeedback = ({
  queryId,
  setPopup,
  feedbackType,
}: QAFeedbackIconProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const size = isHovered ? 22 : 20;
  const paddingY = isHovered ? "" : "py-0.5 ";

  return (
    <div
      onClick={async () => {
        const isSuccessful = await giveFeedback(queryId, feedbackType);
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
  queryId: number;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

export const QAFeedbackBlock = ({
  queryId,
  setPopup,
}: QAFeedbackBlockProps) => {
  return (
    <div className="flex">
      <QAFeedback queryId={queryId} setPopup={setPopup} feedbackType="like" />
      <div className="ml-2">
        <QAFeedback
          queryId={queryId}
          setPopup={setPopup}
          feedbackType="dislike"
        />
      </div>
    </div>
  );
};
