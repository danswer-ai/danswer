import { Bold } from "@tremor/react";
import Image from "next/image";

export function DanswerInitializingLoader() {
  return (
    <div className="mx-auto animate-pulse">
      <div className="h-24 w-24 mx-auto mb-3">
        <Image src="/logo.png" alt="Logo" width="1419" height="1520" />
      </div>
      <Bold>Initializing GrantGPT</Bold>
    </div>
  );
}
