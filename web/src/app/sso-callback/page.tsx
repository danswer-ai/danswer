"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Text } from "@tremor/react";
import { Spinner } from "@/components/Spinner";

export default function SSOCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [authStatus, setAuthStatus] = useState<string>("Authenticating...");

  useEffect(() => {
    const verifyToken = async () => {
      const ssoToken = searchParams.get("sso_token");
      if (!ssoToken) {
        setError("No SSO token found");
        return;
      }

      try {
        setAuthStatus("Verifying SSO token...");
        const response = await fetch(
          `/api/settings/auth/sso-callback?sso_token=${ssoToken}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          setAuthStatus("Authentication successful!");
          setTimeout(() => {
            setAuthStatus("Redirecting to dashboard...");
            setTimeout(() => {
              router.push("/dashboard");
            }, 1000);
          }, 1000);
        } else {
          const errorData = await response.json();
          setError(errorData.detail || "Authentication failed");
        }
      } catch (error) {
        console.error("Error verifying token:", error);
        setError("An unexpected error occurred");
      }
    };

    verifyToken();
  }, [router, searchParams]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="max-w-lg p-8 text-center">
        {error ? (
          <Text className="text-red-500">{error}</Text>
        ) : (
          <>
            <Spinner />
            <Text className="text-lg font-semibold">{authStatus}</Text>
          </>
        )}
      </Card>
    </div>
  );
}
