import { HealthCheckBanner } from "@/components/health/healthcheck";
import { User } from "@/lib/types";
import {
  getCurrentUserSS,
  getAuthUrlSS,
  getAuthTypeMetadataSS,
  AuthTypeMetadata,
} from "@/lib/userSS";
import { redirect } from "next/navigation";
import { SignInButton } from "./SignInButton";
import { LogInForms } from "./LoginForms";
import { Card, Title, Text } from "@tremor/react";
import Link from "next/link";
import Logo from "../../../../public/logo-brand.png";
import { LoginText } from "./LoginText";
import Image from "next/image";
import LoginImage from "../../../../public/LoginImage.png";
import DefaultUserChart from "../../../../public/default-user-chart.png";

const Page = async ({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) => {
  const autoRedirectDisabled = searchParams?.disableAutoRedirect === "true";

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
    if (authTypeMetadata?.requiresVerification && !currentUser.is_verified) {
      return redirect("/auth/waiting-on-verification");
    }

    return redirect("/");
  }

  // get where to send the user to authenticate
  let authUrl: string | null = null;
  if (authTypeMetadata) {
    try {
      authUrl = await getAuthUrlSS(authTypeMetadata.authType);
    } catch (e) {
      console.log(`Some fetch failed for the login page - ${e}`);
    }
  }

  if (authTypeMetadata?.autoRedirect && authUrl && !autoRedirectDisabled) {
    return redirect(authUrl);
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
            {authUrl && authTypeMetadata && (
              <>
                <LoginText />
                <SignInButton
                  authorizeUrl={authUrl}
                  authType={authTypeMetadata?.authType}
                />
              </>
            )}
            {authTypeMetadata?.authType === "basic" && (
              <>
                <LoginText />
                <div className="my-8 w-full">
                  <LogInForms />
                </div>
                <p className="mt-8 text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <Link href="/auth/signup" className="font-semibold text-link">
                    Create an account
                  </Link>
                </p>
              </>
            )}
          </div>
        </div>
        <div className="w-1/2 h-full relative rounded-l-[50px] overflow-hidden hidden lg:flex">
          <Image
            src={LoginImage}
            alt="login-image"
            className="w-full h-full object-cover"
          />
          <Image
            src={DefaultUserChart}
            alt="user-chart-image"
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4"
          />
        </div>
      </div>
    </main>
  );
};

export default Page;
