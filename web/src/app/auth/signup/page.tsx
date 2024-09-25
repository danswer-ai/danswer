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
      <div className="absolute top-6 w-1/2 left-10">
        <Image src={Logo} alt="Logo" className="w-28 xl:w-32" />
      </div>

      <div className="w-screen flex h-full">
        <div className="w-full lg:w-1/2 flex items-center justify-center px-8 lg:px-16 3xl:px-0">
          <div className="w-full md:w-3/4 lg:w-full 3xl:w-1/2">
            <div>
              <h1 className="my-2 text-2xl xl:text-3xl font-bold text-center text-dark-900">
                Create Your Account
              </h1>
              <p className="text-center text-sm text-subtle">
                Welcome back! Please enter your details
              </p>
            </div>

            <div className="py-8">
              <div className="flex items-center gap-6 w-full">
                <Button className="flex-1 truncate" variant="outline">
                  <div className="truncate flex items-center gap-2">
                    <Image
                      src={GmailIcon}
                      alt="gmail-icon"
                      width={16}
                      height={16}
                    />{" "}
                    Continue with Gmail
                  </div>
                </Button>
                <Button
                  className="flex-1 truncate"
                  variant="outline"
                  type="button"
                >
                  <div className="truncate flex items-center gap-2">
                    <Image
                      src={MicrosoftIcon}
                      alt="microsoft-icon"
                      width={16}
                      height={16}
                    />
                    Continue with Microsoft
                  </div>
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
        <div className="w-1/2 h-full relative rounded-l-[50px] overflow-hidden hidden lg:flex">
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
