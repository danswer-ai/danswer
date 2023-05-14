import { Header } from "@/components/Header";
import "./globals.css";

import { Inter } from "next/font/google";
import { getCurrentUserSS } from "@/lib/userSS";
import { redirect } from "next/navigation";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Danswer",
  description: "Question answering for your documents",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans bg-gray-900`}>
        {children}
      </body>
    </html>
  );
}
