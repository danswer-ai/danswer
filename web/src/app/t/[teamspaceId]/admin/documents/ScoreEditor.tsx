import { useToast } from "@/hooks/use-toast";
import { updateBoost } from "./lib";
import { EditableValue } from "@/components/EditableValue";

export const ScoreSection = ({
  documentId,
  initialScore,
  refresh,
  consistentWidth = true,
}: {
  documentId: string;
  initialScore: number;
  refresh: () => void;
  consistentWidth?: boolean;
}) => {
  const { toast } = useToast();

  const onSubmit = async (value: string) => {
    const numericScore = Number(value);
    if (isNaN(numericScore)) {
      toast({
        title: "Invalid Input",
        description: "Please enter a valid number for the score.",
        variant: "destructive",
      });
      return false;
    }

    const errorMsg = await updateBoost(documentId, numericScore);
    if (errorMsg) {
      toast({
        title: "Update Failed",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    } else {
      toast({
        title: "Score Updated",
        description: "The score has been successfully updated.",
        variant: "success",
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
