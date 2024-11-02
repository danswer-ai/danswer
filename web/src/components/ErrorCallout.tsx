import { Callout } from "@/components/ui/callout";

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
        icon="alert"
        type="danger"
      >
        {errorMsg}
      </Callout>
    </div>
  );
}
