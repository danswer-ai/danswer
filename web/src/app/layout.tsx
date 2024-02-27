import "./globals.css";

import { Inter } from "next/font/google";
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
  return (
    <ThemeProvider>
      <html lang="en">
        <body
          className={`${inter.variable} font-sans bg-background dark:bg-neutral-800 dark:text-gray-400`}
        >
          {children}
        </body>
      </html>
    </ThemeProvider>
  );
}
