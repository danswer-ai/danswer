import { HealthCheckBanner } from "@/components/health/healthcheck";
import { User } from "@/lib/types";
import {
  getCurrentUserSS,
  getAuthTypeMetadataSS,
  AuthTypeMetadata,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { EmailPasswordForm } from "../login/EmailPasswordForm";
import { Card, Title, Text } from "@tremor/react";
import Link from "next/link";
/* import { Logo } from "@/components/Logo"; */

import Logo from "../../../../public/logo-brand.png";
import Image from "next/image";

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
      <div className="absolute w-full top-10x">
        <HealthCheckBanner />
      </div>
      <div className="flex items-center justify-center min-h-screen px-6 py-12 sm:px-6 lg:px-8">
        <div>
          <Card className="mt-4 md:w-96">
            <Title className="flex items-center justify-center gap-2 py-3 w-100">
              <Image src={Logo} alt="Logo" className="w-40" />
              {/* TODO: Change this into enterprise settings application name */}
              {/* you need to make this page not async to be able to get settings context */}
            </Title>
            <div className="flex flex-col mt-5">
              <h1 className="text-xl font-bold text-black">Sign Up</h1>
              <Text>
                Already have an account?{" "}
                <Link href="/auth/login" className="font-medium text-link">
                  Log In
                </Link>
              </Text>
            </div>
            <div className="py-5">
              <EmailPasswordForm
                isSignup
                shouldVerify={authTypeMetadata?.requiresVerification}
              />
            </div>
            <p className="text-sm">
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
          </Card>
        </div>
      </div>
    </main>
  );
};

export default Page;
