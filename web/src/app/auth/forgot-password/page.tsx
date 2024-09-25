import { HealthCheckBanner } from "@/components/health/healthcheck";
import { User } from "@/lib/types";
import {
  getCurrentUserSS,
  getAuthTypeMetadataSS,
  AuthTypeMetadata,
} from "@/lib/userSS";
import { redirect } from "next/navigation";

import Logo from "../../../../public/logo-brand.png";
import Image from "next/image";
import { Progress } from "@/components/ui/progress";
import { EnterEmail } from "./steps/EnterEmail";

const Page = async () => {
  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let authTypeMetadata: AuthTypeMetadata | null = null;
  let currentUser: User | null = null;
  try {
    [authTypeMetadata, currentUser] = await Promise.all([
      getAuthTypeMetadataSS(),
      getCurrentUserSS(),
    ]);
  } catch (e) {
    console.log(`Some fetch failed for the login page - ${e}`);
  }

  // simply take the user to the home page if Auth is disabled
  if (authTypeMetadata?.authType === "disabled") {
    return redirect("/");
  }

  // if user is already logged in, take them to the main app page
  if (currentUser && currentUser.is_active) {
    if (!authTypeMetadata?.requiresVerification || currentUser.is_verified) {
      return redirect("/");
    }
    return redirect("/auth/waiting-on-verification");
  }

  // only enable this page if basic login is enabled
  if (authTypeMetadata?.authType !== "basic") {
    return redirect("/");
  }

  return (
    <main className="relative h-full px-6 md:px-0">
      <HealthCheckBanner />
      <div className="absolute top-6 left-10">
        <Image src={Logo} alt="Logo" className="w-28 xl:w-32" />
      </div>

      <div className="flex justify-center items-center h-full">
        <div className="w-[500px]">
          <EnterEmail />
        </div>
      </div>

      <div className="w-[500px] flex gap-2 absolute bottom-10 left-1/2 -translate-x-1/2">
        <Progress value={100} />
        <Progress value={0} />
      </div>
    </main>
  );
};

export default Page;
