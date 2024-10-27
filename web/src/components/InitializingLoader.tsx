import { Bold } from "@tremor/react";
import Image from "next/image";
import Logo from "../../public/logo.png";

export function InitializingLoader() {
  return (
    <div className="mx-auto animate-pulse z-modal">
      <div className="h-24 w-24 mx-auto mb-3">
        <Image src={Logo} alt="Logo" width="1419" height="1520" />
      </div>
      <Bold>Initializing enMedD AI</Bold>
    </div>
  );
}
