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
      <body>{children}</body>
    </html>
  );
}
