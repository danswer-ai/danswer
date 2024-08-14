import "./globals.css";
import { Inter as FontSans } from "next/font/google";
import { getCombinedSettings } from "@/components/settings/lib";
import { CUSTOM_ANALYTICS_ENABLED } from "@/lib/constants";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import { Metadata } from "next";
import { buildClientUrl } from "@/lib/utilsSS";
import { ChatProvider } from "@/components/context/ChatContext";
import { fetchChatData } from "@/lib/chat/fetchChatData";
import { redirect } from "next/navigation";

const fontSans = FontSans({
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-sans",
});

export async function generateMetadata(): Promise<Metadata> {
  const dynamicSettings = await getCombinedSettings({ forceRetrieval: true });
  const logoLocation =
    dynamicSettings.enterpriseSettings &&
    dynamicSettings.enterpriseSettings?.use_custom_logo
      ? "/api/enterprise-settings/logo"
      : buildClientUrl("/enmedd-chp.ico");

  return {
    title: dynamicSettings.enterpriseSettings?.application_name ?? "enMedD CHP",
    description: "enMedD Conversational Health Platform",
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
  const combinedSettings = await getCombinedSettings({});
  const chatData = await fetchChatData({});

  if ("redirect" in chatData) {
    redirect(chatData.redirect);
  }

  const {
    user,
    chatSessions,
    availableSources,
    documentSets,
    personas,
    tags,
    llmProviders,
    folders,
    openedFolders,
  } = chatData;

  return (
    <html lang="en">
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
        className={`${fontSans.variable} font-sans text-default bg-background ${
          process.env.THEME_IS_DARK?.toLowerCase() === "true" ? "dark" : ""
        }`}
      >
        <SettingsProvider settings={combinedSettings}>
          <ChatProvider
            value={{
              user,
              chatSessions,
              availableSources,
              availableDocumentSets: documentSets,
              availablePersonas: personas,
              availableTags: tags,
              llmProviders,
              folders,
              openedFolders,
            }}
          >
            {children}
          </ChatProvider>
        </SettingsProvider>
      </body>
    </html>
  );
}
