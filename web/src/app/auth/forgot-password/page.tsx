import { HealthCheckBanner } from "@/components/health/healthcheck";
import { User } from "@/lib/types";
import {
  getCurrentUserSS,
  getAuthTypeMetadataSS,
  AuthTypeMetadata,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { Progress } from "@/components/ui/progress";
import { EnterEmail } from "./steps/EnterEmail";
import { WelcomeTopBar } from "@/components/TopBar";

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
    <main className="h-full overflow-y-auto">
      <HealthCheckBanner />

      <div className="w-full h-full flex flex-col justify-between items-center mx-auto">
        <WelcomeTopBar />

        <div className="w-full md:w-[500px] flex items-center justify-center px-6 md:px-0">
          <EnterEmail />
        </div>

        <div className="w-full md:w-[500px]  flex gap-2 px-6 md:px-0 py-10">
          <Progress value={100} />
          <Progress value={0} />
        </div>
      </div>
    </main>
  );
};

export default Page;
