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
    <div className="text-dark-900">
      <h1 className="my-2 text-3xl font-bold">Login</h1>
      <p>
        Welcome back to{" "}
        {settings?.enterpriseSettings?.application_name || "enMedD CHP"}! Please
        enter your details
      </p>
    </div>
  );
};
