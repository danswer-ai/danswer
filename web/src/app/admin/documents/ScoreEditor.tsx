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
        title: "Error",
        description: "Score must be a number",
        variant: "destructive",
      });
      return false;
    }

    const errorMsg = await updateBoost(documentId, numericScore);
    if (errorMsg) {
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
      return false;
    } else {
      toast({
        title: "Success",
        description: "Updated score!",
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
