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
    <div className="text-black">
      <h1 className="font-bold text-3xl my-2">Login</h1>
      <p>Welcome back to {settings?.enterpriseSettings?.application_name || "enMedD CHP"}! Please enter your details</p>
    </div>
  );
};
