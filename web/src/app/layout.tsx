import { fetchSettingsSS } from "@/components/settings/lib";
import "./globals.css";

import { Inter } from "next/font/google";
import { SettingsProvider } from "@/components/settings/SettingsProvider";
import {ThemeProvider} from "@/app/ThemeContext";

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
    <ThemeProvider>
      <html lang="en">
        <body
          className={`${inter.variable} font-sans text-default bg-background dark:bg-neutral-800 dark:text-gray-400 ${
            // TODO: remove this once proper dark mode exists
            process.env.THEME_IS_DARK?.toLowerCase() === "true" ? "dark" : ""
          }`}
        >
          <SettingsProvider settings={combinedSettings}>
            {children}
          </SettingsProvider>
        </body>
      </html>
    </ThemeProvider>
  );
}
