import { Bold } from "@tremor/react";
import { Logo } from "./Logo";

export function DanswerInitializingLoader() {
  return (
    <div className="mx-auto animate-pulse">
      <Logo height={96} width={96} className="mx-auto mb-3" />
      <Bold>
        Initializing{" "}
        {combinedSettings?.enterpriseSettings?.application_name ?? "Danswer"}
      </Bold>
    </div>
  );
}
