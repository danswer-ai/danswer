import { useState } from "react";
import { PopupSpec, usePopup } from "../admin/connectors/Popup";
import { ThumbsDownIcon, ThumbsUpIcon } from "../icons/icons";

type DocumentFeedbackType = "endorse" | "reject" | "hide" | "unhide";

const giveDocumentFeedback = async (
  queryId: number,
  searchFeedback: DocumentFeedbackType
): Promise<boolean> => {
  const response = await fetch("/api/doc-retrieval-feedback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query_id: queryId,
      search_feedback: searchFeedback,
      click: false,
      document_rank: 0,
      document_id: "",
    }),
  });
  return response.ok;
};

interface DocumentFeedbackIconProps {
  queryId: number;
  setPopup: (popupSpec: PopupSpec | null) => void;
  feedbackType: DocumentFeedbackType;
}

const DocumentFeedback = ({
  queryId,
  setPopup,
  feedbackType,
}: DocumentFeedbackIconProps) => {
  const [isHovered, setIsHovered] = useState(false);

  const size = isHovered ? 18 : 16;
  const paddingY = isHovered ? "" : "py-0.5 ";

  let icon = null;
  if (feedbackType === "endorse") {
    icon = (
      <ThumbsUpIcon
        size={size}
        className="my-auto flex flex-shrink-0 text-green-600"
      />
    );
  }
  if (feedbackType === "reject") {
    icon = (
      <ThumbsDownIcon
        size={size}
        className="my-auto flex flex-shrink-0 text-red-700"
      />
    );
  }
  if (!icon) {
    // TODO: support other types of feedback
    return null;
  }

  return (
    <div
      onClick={async () => {
        const isSuccessful = await giveDocumentFeedback(queryId, feedbackType);
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
      {icon}
    </div>
  );
};

interface DocumentFeedbackBlockProps {
  queryId: number;
}

export const DocumentFeedbackBlock = ({ queryId }: DocumentFeedbackBlockProps) => {
  const { popup, setPopup } = usePopup();

  return (
    <div className="flex">
      {popup}
      <DocumentFeedback queryId={queryId} setPopup={setPopup} feedbackType="endorse" />
      <div className="ml-2">
        <DocumentFeedback
          queryId={queryId}
          setPopup={setPopup}
          feedbackType="reject"
        />
      </div>
    </div>
  );
};
