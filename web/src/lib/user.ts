import { User } from "./types";

// should be used client-side only
export const getCurrentUser = async (): Promise<User | null> => {
  const response = await fetch("/api/manage/me", {
    credentials: "include",
  });
  if (!response.ok) {
    return null;
  }
  const user = await response.json();
  return user;
};

export const logout = async (): Promise<boolean> => {
  const response = await fetch("/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  return response.ok;
};
