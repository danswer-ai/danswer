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
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GmailIcon } from "@/components/icons/icons";
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
    <main>
      <div className="absolute w-full top-10">
        <HealthCheckBanner />
      </div>
      <div className="flex items-center justify-center min-h-screen px-6 py-12 sm:px-6 lg:px-8">
        <div>
          <Card className="flex flex-col items-center px-5 py-8 md:p-12 ">
            <CardHeader className="p-0">
              <Image src={Logo} alt="Logo" className="w-40" />
            </CardHeader>
            <CardContent className="w-full p-0">
              <div className="flex flex-col mt-5">
                <h1 className="text-2xl font-bold text-dark-900">Sign Up</h1>
                <p className="text-sm text-dark-500 pt-2">
                  Already have an account?{" "}
                  <Link href="/auth/login" className="font-medium text-link">
                    Log In
                  </Link>
                </p>
              </div>

              <div className="py-8">
                <SignupForms
                  shouldVerify={authTypeMetadata?.requiresVerification}
                />
              </div>
            </CardContent>
            <CardFooter className="p-0">
              <p className="text-sm text-dark-500">
                By signing in, you agree to our{" "}
                <Link href={"#"} className="font-medium text-link">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href={"#"} className="font-medium text-link">
                  Privacy Policy
                </Link>
                .
              </p>
            </CardFooter>
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Page;
