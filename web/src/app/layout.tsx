import "./globals.css";

import {
  fetchEnterpriseSettingsSS,
  fetchSettingsSS,
  SettingsError,
} from "@/components/settings/lib";
import {
  CUSTOM_ANALYTICS_ENABLED,
  SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED,
} from "@/lib/constants";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { Metadata } from "next";
import { buildClientUrl } from "@/lib/utilsSS";
import { Inter } from "next/font/google";
import Head from "next/head";
import { EnterpriseSettings } from "./admin/settings/interfaces";
import { redirect } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  let logoLocation = buildClientUrl("/danswer.ico");
  let enterpriseSettings: EnterpriseSettings | null = null;
  if (SERVER_SIDE_ONLY__PAID_ENTERPRISE_FEATURES_ENABLED) {
    enterpriseSettings = await (await fetchEnterpriseSettingsSS()).json();
    logoLocation =
      enterpriseSettings && enterpriseSettings.use_custom_logo
        ? "/api/enterprise-settings/logo"
        : buildClientUrl("/danswer.ico");
  }

  return {
    title: enterpriseSettings?.application_name ?? "Danswer",
    description: "Question answering for your documents",
    icons: {
      icon: logoLocation,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const combinedSettings = await fetchSettingsSS();
  if (!combinedSettings) {
    // Just display a simple full page error if fetching fails.
    return (
      <html lang="en">
        <Head>
          <title>Settings Unavailable</title>
        </Head>
        <body>
          <div className="error">
            Settings could not be loaded. Please try again later.
          </div>
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, interactive-widget=resizes-content"
        />
      </Head>

      {CUSTOM_ANALYTICS_ENABLED && combinedSettings.customAnalyticsScript && (
        <head>
          <script
            type="text/javascript"
            dangerouslySetInnerHTML={{
              __html: combinedSettings.customAnalyticsScript,
            }}
          />
        </head>
      )}

      <body className={`relative ${inter.variable} font-sans`}>
        <div
          className={`text-default bg-background ${
            // TODO: remove this once proper dark mode exists
            process.env.THEME_IS_DARK?.toLowerCase() === "true" ? "dark" : ""
          }`}
        >
          <SettingsProvider settings={combinedSettings}>
            {children}
          </SettingsProvider>
        </div>
      </body>
    </html>
  );
}
