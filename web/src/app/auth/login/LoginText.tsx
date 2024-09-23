"use client";

import React from "react";
import { useContext } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";

export const LoginText = () => {
  const settings = useContext(SettingsContext);

  if (!settings) {
    throw new Error("SettingsContext is not available");
  }

  return (
    <div>
      <h1 className="my-2 text-2xl xl:text-3xl font-bold text-center text-dark-900">
        Welcome Back to {settings?.workspaces?.workspace_name || "Arnold Ai"}
      </h1>
      <p className="text-center text-sm text-subtle">
        Welcome back to ! Please enter your details Welcome back! Please enter
        your details.
      </p>
    </div>
  );
};
