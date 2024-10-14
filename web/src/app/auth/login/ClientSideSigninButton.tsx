"use client";

import { useState, useEffect } from "react";
import { SignInButton } from "./SignInButton";
import { AuthTypeMetadata } from "@/lib/userSS";
import { AuthType } from "@/lib/constants";

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

const ClientSideSigninButton = () => {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [authTypeMetadata, setAuthTypeMetadata] =
    useState<AuthTypeMetadata | null>(null);
  const [currentUrl, setCurrentUrl] = useState<string>("");

  useEffect(() => {
    const fetchAuthData = async () => {
      try {
        // Fetch the auth type metadata
        const authTypeMetadataResponse = await fetch("/api/auth/type");
        if (!authTypeMetadataResponse.ok) {
          throw new Error("Failed to fetch auth type metadata");
        }
        const authTypeMetadataJson = await authTypeMetadataResponse.json();
        const authTypeMetadataData: AuthTypeMetadata = {
          authType: authTypeMetadataJson.auth_type as AuthType,
          autoRedirect: false, // Default value, adjust if needed
          requiresVerification: authTypeMetadataJson.requires_verification,
        };

        setAuthTypeMetadata(authTypeMetadataData);

        // Fetch the auth URL based on the auth type
        const authUrlResponse = await getAuthUrl(authTypeMetadataData.authType);
        console.log(authUrlResponse);
        setAuthUrl(authUrlResponse);
      } catch (error) {
        console.error("Error fetching auth data:", error);
      }
    };

    fetchAuthData();

    // Set the current URL safely on the client side
    setCurrentUrl(window.location.href);
  }, []);

  if (!authUrl || !currentUrl || !authTypeMetadata) {
    return <p>Loading...</p>;
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      <SignInButton
        authorizeUrl={authUrl}
        authType={authTypeMetadata.authType}
      />
    </div>
  );
};

export default ClientSideSigninButton;
