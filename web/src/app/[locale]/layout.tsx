import "./globals.css";

import { Inter } from "next/font/google";

import TranslationsProvider from '@/components/TranslationsProvider';
import initTranslations from '@/app/i18n';

const i18nNamespaces = ['translation'];


const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: { title: string; description: string } = {
  title: "Danswer",
  description: "Question answering for your documents",
};

export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
  params :{locale}

}: {
  children: React.ReactNode;
  params: {
    locale: string;
  };

}) {

 const { t, resources } = await initTranslations(locale, i18nNamespaces);

  return (
    <TranslationsProvider
        namespaces={i18nNamespaces}
        locale={locale}
        resources={resources}>
        <html lang={locale}>
          <body
            className={`${inter.variable} font-sans text-default bg-background`}
          >
            {children}
          </body>
        </html>
    </TranslationsProvider>
  );
}
