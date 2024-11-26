import "./globals.css";
import { Inter } from "next/font/google";
import { fetchSettingsSS } from "@/components/settings/lib";
import { CUSTOM_ANALYTICS_ENABLED } from "@/lib/constants";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { Metadata } from "next";
import { buildClientUrl } from "@/lib/utilsSS";
import { Toaster } from "@/components/ui/toaster";
import PageSwitcher from "@/components/PageSwitcher";
import { UserProvider } from "@/components/user/UserProvider";
import Head from "next/head";
import { Card } from "@/components/ui/card";
import { Logo } from "@/components/Logo";
import { HeaderTitle } from "@/components/header/HeaderTitle";
import { ProviderContextProvider } from "@/components/chat_search/ProviderContext";
import ThemeProvider from "@/components/ThemeProvider";
import { fetchFeatureFlagSS } from "@/components/feature_flag/lib";
import { FeatureFlagProvider } from "@/components/feature_flag/FeatureFlagContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const dynamicSettings = await fetchSettingsSS();
  const logoLocation =
    dynamicSettings?.workspaces && dynamicSettings.workspaces.use_custom_logo
      ? "/api/workspace/logo"
      : buildClientUrl("/arnold_ai.ico");

  return {
    title: dynamicSettings?.workspaces?.workspace_name || "Arnold AI",
    description:
      dynamicSettings?.workspaces?.workspace_description ||
      "Empowering Medical Devices with AI",
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
  const featureFlags = await fetchFeatureFlagSS();

  if (!combinedSettings) {
    // Just display a simple full page error if fetching fails.

    return (
      <html lang="en" className={`${inter.variable} font-sans`}>
        <Head>
          <title>Settings Unavailable | Arnold AI</title>
        </Head>
        <body className="bg-background text-default">
          <div className="flex flex-col items-center justify-center min-h-screen">
            <div className="mb-4 flex items-center max-w-[175px]">
              <HeaderTitle>Arnold AI</HeaderTitle>
              <Logo height={40} width={40} />
            </div>

            <Card className="p-8 max-w-md">
              <h1 className="text-2xl font-bold mb-4 text-error">Error</h1>
              <p className="text-text-500">
                Your Arnold AI instance was not configured properly and your
                settings could not be loaded. This could be due to an admin
                configuration issue or an incomplete setup.
              </p>
            </Card>
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

      <body
        className={`${inter.variable} font-sans text-default bg-background ${
          process.env.THEME_IS_DARK?.toLowerCase() === "true" ? "dark" : ""
        }`}
      >
        <FeatureFlagProvider flags={featureFlags}>
          <UserProvider>
            <ProviderContextProvider>
              <SettingsProvider settings={combinedSettings}>
                <ThemeProvider />
                {children}
                <Toaster />
                <PageSwitcher />
              </SettingsProvider>
            </ProviderContextProvider>
          </UserProvider>
        </FeatureFlagProvider>
      </body>
    </html>
  );
}
