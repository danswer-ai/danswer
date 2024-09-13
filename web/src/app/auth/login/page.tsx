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
import { Logo } from "@/components/Logo";
import { LoginText } from "./LoginText";
import Image from "next/image";
import LoginImage from "../../../../public/login_page_img.webp";

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
    <main>
      <HealthCheckBanner />
      <div className="flex justify-center">
        <div className="flex items-center justify-center lg:justify-between w-full min-h-screen px-6 md:w-2/3 md:px-0 gap-10">
          <div>
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
              <div className="lg:w-96">
                <LoginText />
                <div className="my-6">
                  <LogInForms />
                </div>
                <div className="flex">
                  <Text className="mt-4">
                    Don&apos;t have an account?{" "}
                    <Link href="/auth/signup" className="font-medium text-link">
                      Create an account
                    </Link>
                  </Text>
                </div>
              </div>
            )}
          </div>
          <Image
            src={LoginImage}
            alt="LoginImage"
            className="hidden w-1/2 h-auto lg:flex"
          />
        </div>
      </div>
    </main>
  );
};

export default Page;
