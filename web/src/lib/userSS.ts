import { cookies } from "next/headers";
import { User } from "./types";
import { buildUrl } from "./utilsSS";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { AuthType, SERVER_SIDE_ONLY__CLOUD_ENABLED } from "./constants";

export interface AuthTypeMetadata {
  authType: AuthType;
  autoRedirect: boolean;
  requiresVerification: boolean;
}

export const getAuthTypeMetadataSS = async (): Promise<AuthTypeMetadata> => {
  const res = await fetch(buildUrl("/auth/type"));
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data: { auth_type: string; requires_verification: boolean } =
    await res.json();

  let authType: AuthType;

  // Override fasapi users auth so we can use both
  if (SERVER_SIDE_ONLY__CLOUD_ENABLED) {
    authType = "cloud";
  } else {
    authType = data.auth_type as AuthType;
  }

  // for SAML / OIDC, we auto-redirect the user to the IdP when the user visits
  // Danswer in an un-authenticated state
  if (authType === "oidc" || authType === "saml") {
    return {
      authType,
      autoRedirect: true,
      requiresVerification: data.requires_verification,
    };
  }
  return {
    authType,
    autoRedirect: false,
    requiresVerification: data.requires_verification,
  };
};

export const getAuthDisabledSS = async (): Promise<boolean> => {
  return (await getAuthTypeMetadataSS()).authType === "disabled";
};

const getOIDCAuthUrlSS = async (nextUrl: string | null): Promise<string> => {
  const res = await fetch(
    buildUrl(
      `/auth/oidc/authorize${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ""}`
    )
  );
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

const getGoogleOAuthUrlSS = async (): Promise<string> => {
  const res = await fetch(buildUrl(`/auth/oauth/authorize`), {
    headers: {
      cookie: processCookies(await cookies()),
    },
  });
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

const getSAMLAuthUrlSS = async (): Promise<string> => {
  const res = await fetch(buildUrl("/auth/saml/authorize"));
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

export const getAuthUrlSS = async (
  authType: AuthType,
  nextUrl: string | null
): Promise<string> => {
  // Returns the auth url for the given auth type
  switch (authType) {
    case "disabled":
      return "";
    case "basic":
      return "";
    case "google_oauth": {
      return await getGoogleOAuthUrlSS();
    }
    case "cloud": {
      return await getGoogleOAuthUrlSS();
    }
    case "saml": {
      return await getSAMLAuthUrlSS();
    }
    case "oidc": {
      return await getOIDCAuthUrlSS(nextUrl);
    }
  }
};

const logoutStandardSS = async (headers: Headers): Promise<Response> => {
  return await fetch(buildUrl("/auth/logout"), {
    method: "POST",
    headers: headers,
  });
};

const logoutSAMLSS = async (headers: Headers): Promise<Response> => {
  return await fetch(buildUrl("/auth/saml/logout"), {
    method: "POST",
    headers: headers,
  });
};

export const logoutSS = async (
  authType: AuthType,
  headers: Headers
): Promise<Response | null> => {
  switch (authType) {
    case "disabled":
      return null;
    case "saml": {
      return await logoutSAMLSS(headers);
    }
    default: {
      return await logoutStandardSS(headers);
    }
  }
};

export const getCurrentUserSS = async (): Promise<User | null> => {
  try {
    const response = await fetch(buildUrl("/me"), {
      credentials: "include",
      next: { revalidate: 0 },
      headers: {
        cookie: (await cookies())
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; "),
      },
    });
    if (!response.ok) {
      return null;
    }
    const user = await response.json();
    console.log("user", user);
    return user;
  } catch (e) {
    console.log(`Error fetching user: ${e}`);
    return null;
  }
};

export const processCookies = (cookies: ReadonlyRequestCookies): string => {
  return cookies
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
};
