import { Callout } from "@/components/ui/callout";
import { FiAlertTriangle } from "react-icons/fi";

export function ErrorCallout({
  errorTitle,
  errorMsg,
}: {
  errorTitle?: string;
  errorMsg?: string;
}) {
  return (
    <div>
      <Callout
        className="mt-4"
        title={errorTitle || "Page not found"}
        icon={<FiAlertTriangle />}
        type="danger"
      >
        {errorMsg}
      </Callout>
    </div>
  );
}
