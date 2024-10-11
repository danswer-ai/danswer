"use client";

import { useState, useEffect } from "react";
import { SignInButton } from "./SignInButton";
import { LoginText } from "./LoginText";
import { AuthTypeMetadata } from "@/lib/userSS";

const getOIDCAuthUrl = async (): Promise<string> => {
  const res = await fetch("/api/auth/oidc/authorize");
  if (!res.ok) {
    throw new Error("Failed to fetch OIDC auth URL");
  }
  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

const getGoogleOAuthUrl = async (): Promise<string> => {
  const res = await fetch("/api/auth/oauth/authorize");
  if (!res.ok) {
    throw new Error("Failed to fetch Google OAuth URL");
  }
  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

const getSAMLAuthUrl = async (): Promise<string> => {
  const res = await fetch("/api/auth/saml/authorize");
  if (!res.ok) {
    throw new Error("Failed to fetch SAML auth URL");
  }
  const data: { authorization_url: string } = await res.json();
  return data.authorization_url;
};

const getAuthUrl = async (authType: string): Promise<string> => {
  switch (authType) {
    case "oidc":
      return await getOIDCAuthUrl();
    case "google_oauth":
      return await getGoogleOAuthUrl();
    case "saml":
      return await getSAMLAuthUrl();
    default:
      throw new Error(`Unsupported auth type: ${authType}`);
  }
};
const currentUrl = window.location.href;

const ClientSideSigninButton = () => {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authTypeMetadata, setAuthTypeMetadata] =
    useState<AuthTypeMetadata | null>(null);

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        // const authTypeMetadataResponse = await fetch("/api/auth/metadata");
        // const authTypeMetadataData = await authTypeMetadataResponse.json();
        // setAuthTypeMetadata(authTypeMetadataData);

        const authUrlResponse = await getAuthUrl("oidc");
        setAuthUrl(authUrlResponse);
      } catch (error) {
        console.error("Error fetching auth data:", error);
      }
    };

    fetchAuthData();
  }, []);

  if (!authUrl) {
    return <p>No auth URL</p>;
  }
  console.log(
    "currentUrl",
    `${authUrl}?next=${encodeURIComponent(currentUrl)}`
  );

  return (
    <div className="flex flex-col items-center space-y-4">
      <SignInButton
        authorizeUrl={`${authUrl}?next=${encodeURIComponent(currentUrl)}`}
        authType={"oidc"}
      />
    </div>
  );
};

export default ClientSideSigninButton;
