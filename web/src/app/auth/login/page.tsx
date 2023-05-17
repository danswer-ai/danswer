import { DISABLE_AUTH } from "@/lib/constants";
import { getGoogleOAuthUrlSS, getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";

const Page = async () => {
  // no need for any of the below if auth is disabled
  if (DISABLE_AUTH) {
    return redirect("/");
  }

  const [currentUser, authorizationUrl] = await Promise.all([
    getCurrentUserSS(),
    getGoogleOAuthUrlSS(),
  ]);

  // if user is already logged in, take them to the main app page
  if (currentUser && currentUser.is_active && currentUser.is_verified) {
    return redirect("/");
  }

  return (
    <main>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-200">
              danswer 💃
            </h2>
          </div>
          <div className="flex">
            <a
              href={authorizationUrl}
              className={
                "group relative w-64 flex justify-center " +
                "py-2 px-4 border border-transparent text-sm " +
                "font-medium rounded-md text-white bg-red-600 " +
                "hover:bg-red-700 focus:outline-none focus:ring-2 " +
                "focus:ring-offset-2 focus:ring-red-500 mx-auto"
              }
            >
              Sign in with Google
            </a>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Page;
