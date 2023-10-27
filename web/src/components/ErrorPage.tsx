import { Callout } from "@tremor/react";
import { FiAlertOctagon } from "react-icons/fi";


export function ErrorPage({ errorTitle, errorMsg }: { errorTitle?: string, errorMsg?: string }) {
  console.log(errorMsg)
  return (
    <div className="container mx-auto dark">
      <Callout
        className="h-12 mt-4"
        title={errorTitle || "Page not found"}
        icon={FiAlertOctagon}
        color="rose"
      >
        HELLO {errorMsg}
      </Callout>
    </div>
  );
}
