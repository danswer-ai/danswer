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
import Link from "next/link";
import { LoginText } from "./LoginText";
import Image from "next/image";
import LoginImage from "../../../../public/login_image.webp";
import DefaultUserChart from "../../../../public/default-user-chart.png";
import { WelcomeTopBar } from "@/components/TopBar";
import { getSecondsUntilExpiration } from "@/lib/time";

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
  const secondsTillExpiration = getSecondsUntilExpiration(currentUser);
  if (
    currentUser &&
    currentUser.is_active &&
    (secondsTillExpiration === null || secondsTillExpiration > 0)
  ) {
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

      <div className="w-screen flex h-full">
        <div className="w-full xl:w-1/2 h-full mx-auto flex flex-col justify-between  overflow-y-auto">
          <WelcomeTopBar />

          <div className="w-full h-full flex items-center justify-center px-6 lg:px-14 3xl:px-0">
            <div className="w-full md:w-3/4 lg:w-1/2 xl:w-full 3xl:w-1/2 my-auto pb-14 md:pb-20">
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
                  <div className="pt-8 w-full">
                    <LogInForms />
                  </div>
                  <p className="pt-8 text-center text-sm">
                    Don&apos;t have an account?{" "}
                    <Link
                      href="/auth/signup"
                      className="text-sm font-medium text-link hover:underline"
                    >
                      Create an account
                    </Link>
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="w-full h-14 md:h-20"></div>
        </div>
        <div className="w-1/2 h-full relative overflow-hidden hidden xl:flex">
          <Image
            src={LoginImage}
            alt="login-image"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </main>
  );
};

export default Page;
