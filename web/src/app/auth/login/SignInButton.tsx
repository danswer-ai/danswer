import { AuthType } from "@/lib/constants";
import { FaGoogle } from "react-icons/fa";

export function SignInButton({
  authorizeUrl,
  authType,
}: {
  authorizeUrl: string;
  authType: AuthType;
}) {
  let button;
  if (authType === "google_oauth") {
    button = (
      <div className="flex mx-auto">
        <div className="my-auto mr-2">
          <FaGoogle />
        </div>
        <p className="text-sm font-medium select-none">Continue with Google</p>
      </div>
    );
  } else if (authType === "oidc") {
    button = (
      <div className="flex mx-auto">
        <p className="text-sm font-medium select-none">
          Continue with OIDC SSO
        </p>
      </div>
    );
  } else if (authType === "saml") {
    button = (
      <div className="flex mx-auto">
        <p className="text-sm font-medium select-none">
          Continue with SAML SSO
        </p>
      </div>
    );
  }

  if (!button) {
    throw new Error(`Unhandled authType: ${authType}`);
  }

  return (
    <a
      className="flex py-3 mt-6 text-gray-100 rounded cursor-pointer w-72 bg-accent hover:bg-indigo-800"
      href={authorizeUrl}
    >
      {button}
    </a>
  );
}
