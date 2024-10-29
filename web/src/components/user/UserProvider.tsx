"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User, UserRole } from "@/lib/types";
import { getCurrentTeamspaceUser, getCurrentUser } from "@/lib/user";
import { useParams } from "next/navigation";

interface UserContextType {
  user: User | null;
  isLoadingUser: boolean;
  isAdmin: boolean;
  isTeamspaceAdmin: boolean;
  refreshUser: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isTeamspaceAdmin, setIsTeamspaceAdmin] = useState(false);
  const { teamspaceId } = useParams();

  const fetchUser = async () => {
    try {
      const user = await getCurrentUser();
      setUser(user);
      setIsAdmin(user?.role === UserRole.ADMIN);
      if (teamspaceId) {
        const teamspaceUser = await getCurrentTeamspaceUser(teamspaceId[0]);
        setIsTeamspaceAdmin(teamspaceUser?.role === UserRole.ADMIN);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
    } finally {
      setIsLoadingUser(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, [teamspaceId]);

  const refreshUser = async () => {
    await fetchUser();
  };

  return (
    <UserContext.Provider
      value={{ user, isLoadingUser, isAdmin, isTeamspaceAdmin, refreshUser }}
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
