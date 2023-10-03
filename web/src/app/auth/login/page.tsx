import { HealthCheckBanner } from "@/components/health/healthcheck";
import { AuthType, OAUTH_NAME } from "@/lib/constants";
import { User } from "@/lib/types";
import { getCurrentUserSS, getAuthUrlSS, getAuthTypeSS } from "@/lib/userSS";
import { redirect } from "next/navigation";

const BUTTON_STYLE =
  "group relative w-64 flex justify-center " +
  "py-2 px-4 border border-transparent text-sm " +
  "font-medium rounded-md text-white bg-red-600 " +
  " mx-auto";

const Page = async () => {
  // catch cases where the backend is completely unreachable here
  // without try / catch, will just raise an exception and the page
  // will not render
  let authType: AuthType | null = null;
  let currentUser: User | null = null;
  try {
    [authType, currentUser] = await Promise.all([
      getAuthTypeSS(),
      getCurrentUserSS(),
    ]);
  } catch (e) {
    console.log(`Some fetch failed for the login page - ${e}`);
  }

  // simply take the user to the home page if Auth is disabled
  if (authType === "disabled") {
    return redirect("/");
  }

  // if user is already logged in, take them to the main app page
  if (currentUser && currentUser.is_active && currentUser.is_verified) {
    return redirect("/");
  }

  // get where to send the user to authenticate
  let authUrl: string | null = null;
  let autoRedirect: boolean = false;
  if (authType) {
    try {
      [authUrl, autoRedirect] = await getAuthUrlSS(authType);
    } catch (e) {
      console.log(`Some fetch failed for the login page - ${e}`);
    }
  }

  if (autoRedirect && authUrl) {
    return redirect(authUrl);
  }

  return (
    <main>
      <div className="absolute top-10x w-full">
        <HealthCheckBanner />
      </div>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-200">
              danswer 💃
            </h2>
          </div>
          <div className="flex">
            {authUrl ? (
              <a
                href={authUrl || ""}
                className={
                  BUTTON_STYLE +
                  " focus:outline-none focus:ring-2 hover:bg-red-700 focus:ring-offset-2 focus:ring-red-500"
                }
              >
                Sign in with {OAUTH_NAME}
              </a>
            ) : (
              <button className={BUTTON_STYLE + " cursor-default"}>
                Sign in with {OAUTH_NAME}
              </button>
            )}
          </div>
        </div>
      </div>
    </main>
  );
};

export default Page;
