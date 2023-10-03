import { cookies } from "next/headers";
import { User } from "./types";
import { buildUrl } from "./utilsSS";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { AuthType } from "./constants";

export const getAuthTypeSS = async (): Promise<AuthType> => {
  const res = await fetch(buildUrl("/auth/type"));
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data: { auth_type: string } = await res.json();
  return data.auth_type as AuthType;
};

export const getAuthDisabledSS = async (): Promise<boolean> => {
  return (await getAuthTypeSS()) === "disabled";
};

const geOIDCAuthUrlSS = async (): Promise<string> => {
  const res = await fetch(buildUrl("/auth/oidc/authorize"));
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

const getGoogleOAuthUrlSS = async (): Promise<string> => {
  const res = await fetch(buildUrl("/auth/oauth/authorize"));
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
  authType: AuthType
): Promise<[string, boolean]> => {
  // Returns the auth url and whether or not we should auto-redirect
  switch (authType) {
    case "disabled":
      return ["", true];
    case "google_oauth": {
      return [await getGoogleOAuthUrlSS(), false];
    }
    case "saml": {
      return [await getSAMLAuthUrlSS(), true];
    }
    case "oidc": {
      return [await geOIDCAuthUrlSS(), true];
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
    const response = await fetch(buildUrl("/manage/me"), {
      credentials: "include",
      next: { revalidate: 0 },
      headers: {
        cookie: cookies()
          .getAll()
          .map((cookie) => `${cookie.name}=${cookie.value}`)
          .join("; "),
      },
    });
    if (!response.ok) {
      return null;
    }
    const user = await response.json();
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
