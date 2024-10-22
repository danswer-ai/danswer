import { HealthCheckBanner } from "@/components/health/healthcheck";
import { User } from "@/lib/types";
import {
  getCurrentUserSS,
  getAuthTypeMetadataSS,
  AuthTypeMetadata,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { SignupForms } from "./SignupForms";
import Link from "next/link";

import Logo from "../../../../public/logo-brand.png";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import DefaultUserChart from "../../../../public/default-user-chart.png";
import SignupImage from "../../../../public/SignupImage.png";
import GmailIcon from "../../../../public/Gmail.png";
import MicrosoftIcon from "../../../../public/microsoft.svg";
import { Separator } from "@/components/ui/separator";
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
    <main className="relative h-full">
      <HealthCheckBanner />

      <div className="w-screen flex h-full">
        <div className="w-full xl:w-1/2 h-full mx-auto flex flex-col justify-between overflow-y-auto">
          <WelcomeTopBar />

          <div className="w-full h-full flex items-center justify-center px-6 lg:px-14 3xl:px-0">
            <div className="w-full md:w-3/4 lg:w-1/2 xl:w-full 3xl:w-1/2 my-auto pb-14 md:pb-20">
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-center text-dark-900">
                  Create Your Account
                </h1>
                <p className="text-center text-sm text-subtle md:pt-2">
                  Welcome back! Please enter your details
                </p>
              </div>

              <div className="pt-8">
                <div className="flex items-center gap-3 md:gap-6 w-full flex-col md:flex-row">
                  <Button disabled className="flex-1 w-full" variant="outline">
                    <Image
                      src={GmailIcon}
                      alt="gmail-icon"
                      width={16}
                      height={16}
                    />{" "}
                    Continue with Gmail
                  </Button>
                  <Button
                    disabled
                    className="flex-1 w-full"
                    variant="outline"
                    type="button"
                  >
                    <Image
                      src={MicrosoftIcon}
                      alt="microsoft-icon"
                      width={16}
                      height={16}
                    />
                    Continue with Microsoft
                  </Button>
                </div>

                <div className="flex items-center gap-4 pt-8">
                  <Separator className="flex-1" />
                  <p className="whitespace-nowrap text-sm">OR</p>
                  <Separator className="flex-1" />
                </div>

                <div className="pt-8">
                  <SignupForms
                    shouldVerify={authTypeMetadata?.requiresVerification}
                  />
                </div>

                <p className="pt-8 text-center text-sm">
                  Already have an account?{" "}
                  <Link
                    href="/auth/login"
                    className="text-sm font-medium text-link hover:underline"
                  >
                    Sign in
                  </Link>
                </p>
              </div>
            </div>
          </div>

          <div className="w-full h-14 md:h-20"></div>
        </div>
        <div className="w-1/2 h-full relative overflow-hidden hidden xl:flex">
          <Image
            src={SignupImage}
            alt="signup-image"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </main>
  );
};

export default Page;
