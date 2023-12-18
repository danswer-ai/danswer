import { Callout } from "@tremor/react";
import { FiAlertOctagon } from "react-icons/fi";

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
        icon={FiAlertOctagon}
        color="rose"
      >
        {errorMsg}
      </Callout>
    </div>
  );
}
