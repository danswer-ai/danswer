"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/lib/types";
import { getCurrentUser } from "@/lib/user";

interface UserContextType {
  user: User | null;
  isLoadingUser: boolean;
  isAdmin: boolean;
  isCurator: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({
  children,
  user,
}: {
  children: React.ReactNode;
  user: User | null;
}) {
  const [upToDateUser, setUpToDateUser] = useState<User | null>(user);
  const [isLoadingUser, setIsLoadingUser] = useState(false);

  const fetchUser = async () => {
    try {
      setIsLoadingUser(true);
      const currentUser = await getCurrentUser();
      setUpToDateUser(currentUser);
    } catch (error) {
      console.error("Error fetching current user:", error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <UserContext.Provider
      value={{
        user: upToDateUser,
        isLoadingUser,
        refreshUser,
        isAdmin: upToDateUser?.role === UserRole.ADMIN,
        isCurator: upToDateUser?.role === UserRole.CURATOR,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}
