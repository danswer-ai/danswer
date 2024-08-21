"use client";

import { HeaderTitle } from "@/components/header/Header";
import { Logo } from "@/components/Logo";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Context, useContext } from "react";
import Link from "next/link";
import { NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED } from "@/lib/constants";

export default function SideBarHeader() {
    
  const combinedSettings:any = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const enterpriseSettings = combinedSettings.enterpriseSettings;
    return (
        <Link
            className="py-3"
            href={
                settings && settings.default_page === "chat" ? "/chat" : "/search"
            }
            >
            <Logo isFullSize={true} width={200}/>
        </Link>
    );
}