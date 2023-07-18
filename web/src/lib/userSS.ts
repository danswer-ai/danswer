import { cookies } from "next/headers";
import { User } from "./types";
import { buildUrl } from "./utilsSS";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";

export const getGoogleOAuthUrlSS = async (): Promise<string> => {
  const res = await fetch(buildUrl("/auth/oauth/authorize"));
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

// should be used server-side only
export const getCurrentUserSS = async (): Promise<User | null> => {
  try {
    const response = await fetch(buildUrl("/users/me"), {
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
