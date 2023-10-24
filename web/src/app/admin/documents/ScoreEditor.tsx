import { PopupSpec } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { updateBoost } from "./lib";
import { CheckmarkIcon, EditIcon } from "@/components/icons/icons";

export const ScoreSection = ({
  documentId,
  initialScore,
  setPopup,
  refresh,
  consistentWidth = true,
}: {
  documentId: string;
  initialScore: number;
  setPopup: (popupSpec: PopupSpec | null) => void;
  refresh: () => void;
  consistentWidth?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState(initialScore.toString());

  const onSubmit = async () => {
    const numericScore = Number(score);
    if (isNaN(numericScore)) {
      setPopup({
        message: "Score must be a number",
        type: "error",
      });
      return;
    }

    const errorMsg = await updateBoost(documentId, numericScore);
    if (errorMsg) {
      setPopup({
        message: errorMsg,
        type: "error",
      });
    } else {
      setPopup({
        message: "Updated score!",
        type: "success",
      });
      refresh();
      setIsOpen(false);
    }
  };

  if (isOpen) {
    return (
      <div className="my-auto h-full flex">
        <input
          value={score}
          onChange={(e) => {
            setScore(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSubmit();
            }
            if (e.key === "Escape") {
              setIsOpen(false);
              setScore(initialScore.toString());
            }
          }}
          className="border bg-slate-700 text-gray-200 border-gray-300 rounded py-1 px-3 w-16 h-5 my-auto"
        />
        <div onClick={onSubmit} className="cursor-pointer my-auto ml-2">
          <CheckmarkIcon size={16} className="text-green-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex my-auto">
        <div className={"flex" + (consistentWidth && " w-6")}>
          <div className="ml-auto my-auto">{initialScore}</div>
        </div>
        <div
          className="cursor-pointer ml-2 my-auto"
          onClick={() => setIsOpen(true)}
        >
          <EditIcon size={16} />
        </div>
      </div>
    </div>
  );
};
