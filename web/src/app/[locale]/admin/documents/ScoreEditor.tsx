import { PopupSpec } from "@/components/admin/connectors/Popup";
import { updateBoost } from "./lib";
import { EditableValue } from "@/components/EditableValue";

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
  const onSubmit = async (value: string) => {
    const numericScore = Number(value);
    if (isNaN(numericScore)) {
      setPopup({
        message: "Score must be a number",
        type: "error",
      });
      return false;
    }

    const errorMsg = await updateBoost(documentId, numericScore);
    if (errorMsg) {
      setPopup({
        message: errorMsg,
        type: "error",
      });
      return false;
    } else {
      setPopup({
        message: "Updated score!",
        type: "success",
      });
      refresh();
    }

    return true;
  };

  return (
    <EditableValue
      initialValue={initialScore.toString()}
      onSubmit={onSubmit}
      consistentWidth={consistentWidth}
    />
  );
};
