"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Text } from "@tremor/react";
import { Spinner } from "@/components/Spinner";
import { SpinnerBall } from "@phosphor-icons/react/dist/ssr";
import LogoType from "@/components/header/LogoType";
import { Logo } from "@/components/Logo";
import { HeaderTitle } from "@/components/header/HeaderTitle";

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
              router.push("/admin/plan");
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
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-background-50 to-blue-50">
      <Card className="max-w-lg p-8 text-center shadow-xl rounded-xl bg-white">
        {error ? (
          <div className="space-y-4">
            <svg
              className="w-16 h-16 mx-auto text-neutral-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <Text className="text-xl font-bold text-red-600">{error}</Text>
          </div>
        ) : (
          <div className="space-y-6 flex flex-col">
            <div className="flex mx-auto">
              <Logo height={80} width={80} />
            </div>
            <SpinnerBall size="large" className="mx-auto text-neutral-600" />
            <Text className="text-2xl font-semibold text-text-900">
              {authStatus}
            </Text>
            <div className="w-full h-2 bg-background-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-background-600 rounded-full animate-progress"
                style={{
                  animation: "progress 5s ease-out forwards",
                  width: "0%",
                }}
              />
            </div>
            <style jsx>{`
              @keyframes progress {
                0% {
                  width: 0%;
                }
                60% {
                  width: 75%;
                }
                100% {
                  width: 99%;
                }
              }
              .animate-progress {
                animation: progress 5s ease-out forwards;
              }
            `}</style>
          </div>
        )}
      </Card>
    </div>
  );
}
