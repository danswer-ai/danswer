"use client";
import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useMemo,
} from "react";
import { Persona } from "@/app/admin/assistants/interfaces";
import { User } from "@/lib/types";
import {
  classifyAssistants,
  orderAssistantsForUser,
} from "@/lib/assistants/utils";
import { useUser } from "../user/UserProvider";

interface AssistantsContextProps {
  assistants: Persona[];
  finalAssistants: Persona[];
  refreshAssistants: () => Promise<void>;
}

const AssistantsContext = createContext<AssistantsContextProps | undefined>(
  undefined
);

export const AssistantsProvider: React.FC<{
  children: React.ReactNode;
  initialAssistants: Persona[];
}> = ({ children, initialAssistants }) => {
  const [assistants, setAssistants] = useState<Persona[]>(
    initialAssistants || []
  );
  const { user } = useUser();

  const refreshAssistants = async () => {
    try {
      const response = await fetch("/api/persona", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });
      if (!response.ok) throw new Error("Failed to fetch assistants");
      const assistants = await response.json();
      console.log("ASSISTANTS ARE", assistants);
      setAssistants(assistants);
    } catch (error) {
      console.error("Error refreshing assistants:", error);
    }
  };

  const { finalAssistants } = useMemo(() => {
    const { visibleAssistants } = classifyAssistants(user, assistants);
    console.log("VISIBLE ASSISTANTS", visibleAssistants);

    const finalAssistants = user
      ? orderAssistantsForUser(visibleAssistants, user)
      : visibleAssistants;
    console.log("FINAL ASSISTANTS", finalAssistants);
    return { finalAssistants };
  }, [user, assistants]);

  return (
    <AssistantsContext.Provider
      value={{ assistants, finalAssistants, refreshAssistants }}
    >
      {children}
    </AssistantsContext.Provider>
  );
};

export const useAssistants = (): AssistantsContextProps => {
  const context = useContext(AssistantsContext);
  if (!context) {
    throw new Error("useAssistants must be used within an AssistantsProvider");
  }
  return context;
};
