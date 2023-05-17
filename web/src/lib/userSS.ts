import { cookies } from "next/headers";
import { User } from "./types";
import { INTERNAL_URL } from "./constants";

export const buildUrl = (path: string) => {
  if (path.startsWith("/")) {
    return `${INTERNAL_URL}${path}`;
  }
  return `${INTERNAL_URL}/${path}`;
};

export const getGoogleOAuthUrlSS = async (): Promise<string> => {
  const res = await fetch(buildUrl("/auth/google/authorize"));
  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

// should be used server-side only
export const getCurrentUserSS = async (): Promise<User | null> => {
  const response = await fetch(buildUrl("/users/me"), {
    credentials: "include",
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
};
