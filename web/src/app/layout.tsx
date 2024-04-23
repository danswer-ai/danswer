import { fetchSettingsSS } from "@/components/settings/lib";
import "./globals.css";

import { Inter } from "next/font/google";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import Script from "next/script";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Danswer",
  description: "Question answering for your documents",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const combinedSettings = await fetchSettingsSS();

  return (
    <html lang="en">
      <Script
        src="https://analytics.tetrahedron.dev/script.js"
        data-website-id="9ebecade-5b34-4048-b65b-ec4e29d9b760"
      />
      <body
        className={`${inter.variable} font-sans text-default bg-background ${
          // TODO: remove this once proper dark mode exists
          process.env.THEME_IS_DARK?.toLowerCase() === "true" ? "dark" : ""
        }`}
      >
        <SettingsProvider settings={combinedSettings}>
          {children}
        </SettingsProvider>
      </body>
    </html>
  );
}
