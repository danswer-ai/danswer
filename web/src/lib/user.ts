import { User } from "./types";

export const checkUserIsNoAuthUser = (userId: string) => {
  return userId === "__no_auth_user__";
};

// should be used client-side only
let cachedUser: User | null = null;
let cacheExpiration: number = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const getCurrentUser = async (): Promise<User | null> => {
  const now = Date.now();

  if (cachedUser && now < cacheExpiration) {
    return cachedUser;
  }

  const response = await fetch("/api/me", {
    credentials: "include",
  });

  if (!response.ok) {
    cachedUser = null;
  } else {
    cachedUser = await response.json();
    cacheExpiration = now + CACHE_DURATION;
  }

  return cachedUser;
};

export const logout = async (): Promise<Response> => {
  const response = await fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  return response;
};

export const basicLogin = async (
  email: string,
  password: string
): Promise<Response> => {
  const params = new URLSearchParams([
    ["username", email],
    ["password", password],
  ]);
  const response = await fetch("/api/auth/login", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  return response;
};

export const basicSignup = async (email: string, password: string) => {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      username: email,
      password,
    }),
  });
  return response;
};
