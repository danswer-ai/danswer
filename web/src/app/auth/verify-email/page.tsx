import {
  AuthTypeMetadata,
  getAuthTypeMetadataSS,
  getCurrentUserSS,
} from "@/lib/userSS";
import { EmailVerificationComponent } from "@/components/authPageComponents/signup/AuthSignupVerification";
import { User } from "@/lib/types";
import { redirect } from "next/navigation";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import Image from "next/image";

export default async function Page() {
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

  if (!authTypeMetadata?.requiresVerification || currentUser?.is_verified) {
    return redirect("/");
  }

  

  return (
    <main>
      <div className="absolute top-10x w-full">
        <HealthCheckBanner />
      </div>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div>
          <div className="h-16 w-16 mx-auto animate-pulse">
            <Image src="/logo.png" alt="Logo" width="1419" height="1520" />
          </div>
        <EmailVerificationComponent user={currentUser} />
      </div>
      </div>
    </main>
  );
}
