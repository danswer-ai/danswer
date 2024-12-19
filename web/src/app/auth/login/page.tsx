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
import { EmailPasswordForm } from "./EmailPasswordForm";
import Title from "@/components/ui/title";
import Text from "@/components/ui/text";
import Link from "next/link";
import { LoginText } from "./LoginText";
import { getSecondsUntilExpiration } from "@/lib/time";
import AuthFlowContainer from "@/components/auth/AuthFlowContainer";
import CardSection from "@/components/admin/CardSection";

const Page = async (props: {
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const searchParams = await props.searchParams;
  const autoRedirectDisabled = searchParams?.disableAutoRedirect === "true";
  const nextUrl = Array.isArray(searchParams?.next)
    ? searchParams?.next[0]
    : searchParams?.next || null;

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
    return redirect("/chat");
  }

  // if user is already logged in, take them to the main app page
  const secondsTillExpiration = getSecondsUntilExpiration(currentUser);
  if (
    currentUser &&
    currentUser.is_active &&
    !currentUser.is_anonymous_user &&
    (secondsTillExpiration === null || secondsTillExpiration > 0)
  ) {
    if (authTypeMetadata?.requiresVerification && !currentUser.is_verified) {
      return redirect("/auth/waiting-on-verification");
    }
    return redirect("/chat");
  }

  // get where to send the user to authenticate
  let authUrl: string | null = null;
  if (authTypeMetadata) {
    try {
      authUrl = await getAuthUrlSS(authTypeMetadata.authType, nextUrl!);
    } catch (e) {
      console.log(`Some fetch failed for the login page - ${e}`);
    }
  }

  if (authTypeMetadata?.autoRedirect && authUrl && !autoRedirectDisabled) {
    return redirect(authUrl);
  }

  return (
    <AuthFlowContainer>
      <div className="absolute top-10x w-full">
        <HealthCheckBanner />
      </div>

      <div className="flex flex-col w-full justify-center">
        {authUrl && authTypeMetadata && (
          <>
            <h2 className="text-center text-xl text-strong font-bold">
              <LoginText />
            </h2>

            <SignInButton
              authorizeUrl={authUrl}
              authType={authTypeMetadata?.authType}
            />
          </>
        )}

        {authTypeMetadata?.authType === "cloud" && (
          <div className="mt-4 w-full justify-center">
            <div className="flex items-center w-full my-4">
              <div className="flex-grow border-t border-gray-300"></div>
              <span className="px-4 text-gray-500">or</span>
              <div className="flex-grow border-t border-gray-300"></div>
            </div>
            <EmailPasswordForm shouldVerify={true} nextUrl={nextUrl} />

            <div className="flex">
              <Text className="mt-4 mx-auto">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/auth/signup${
                    searchParams?.next ? `?next=${searchParams.next}` : ""
                  }`}
                  className="text-link font-medium"
                >
                  Create an account
                </Link>
              </Text>
            </div>
          </div>
        )}

        {authTypeMetadata?.authType === "basic" && (
          <CardSection className="mt-4 w-96">
            <div className="flex">
              <Title className="mb-2 mx-auto font-bold">
                <LoginText />
              </Title>
            </div>
            <EmailPasswordForm nextUrl={nextUrl} />
            <div className="flex">
              <Text className="mt-4 mx-auto">
                Don&apos;t have an account?{" "}
                <Link
                  href={`/auth/signup${
                    searchParams?.next ? `?next=${searchParams.next}` : ""
                  }`}
                  className="text-link font-medium"
                >
                  Create an account
                </Link>
              </Text>
            </div>
          </CardSection>
        )}
      </div>
    </AuthFlowContainer>
  );
};

export default Page;
