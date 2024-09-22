// app/auth/sso-callback/layout.tsx
import React from "react";

export const metadata = {
  title: "SSO Callback",
};

export default function SSOCallbackLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>SSO Callback</title>
        {/* Include any meta tags or scripts specific to this page */}
      </head>
      <body>
        {/* Minimal styling or components */}
        {children}
      </body>
    </html>
  );
}
