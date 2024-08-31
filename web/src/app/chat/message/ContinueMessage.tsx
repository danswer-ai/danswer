import { EmphasizedClickable } from "@/components/BasicClickable";
import { FiBook, FiPlayCircle } from "react-icons/fi";

export function ContinueGenerating({
  handleContinueGenerating,
}: {
  handleContinueGenerating: () => void;
}) {
  return (
    <div className="flex text-sm !pt-0">
      <div className="flex mb-auto">
        <FiPlayCircle className="my-auto flex-none mr-2" size={14} />
        <div className="my-auto cursor-default">
          <span className="mobile:hidden">
            The AI stopped generating due to the LLM's limits. Continue?
          </span>
          <span className="desktop:hidden">Continue?</span>
        </div>
      </div>

      <div className="ml-auto my-auto" onClick={handleContinueGenerating}>
        <EmphasizedClickable size="sm">
          <div className="w-24 text-xs">Continue</div>
        </EmphasizedClickable>
      </div>
    </div>
  );
}
