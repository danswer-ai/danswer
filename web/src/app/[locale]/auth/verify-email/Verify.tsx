"use client";

import { HealthCheckBanner } from "@/components/health/healthcheck";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import { Text } from "@tremor/react";
import { RequestNewVerificationEmail } from "../waiting-on-verification/RequestNewVerificationEmail";
import { User } from "@/lib/types";

export function Verify({ user }: { user: User | null }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [error, setError] = useState("");

  async function verify() {
    const token = searchParams.get("token");
    if (!token) {
      setError(
        "Missing verification token. Try requesting a new verification email."
      );
      return;
    }

    const response = await fetch("/api/auth/verify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ token }),
    });

    if (response.ok) {
      router.push("/");
    } else {
      const errorDetail = (await response.json()).detail;
      setError(
        `Failed to verify your email - ${errorDetail}. Please try requesting a new verification email.`
      );
    }
  }

  useEffect(() => {
    verify();
  }, []);

  return (
    <main>
      <div className="absolute top-10x w-full">
        <HealthCheckBanner />
      </div>
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div>
          <div className="h-16 w-16 mx-auto animate-pulse">
            <Image src="/logo.png" alt="Logo" width="1419" height="1520" />
          </div>

          {!error ? (
            <Text className="mt-2">Verifying your email...</Text>
          ) : (
            <div>
              <Text className="mt-2">{error}</Text>

              {user && (
                <div className="text-center">
                  <RequestNewVerificationEmail email={user.email}>
                    <Text className="mt-2 text-link">
                      Get new verification email
                    </Text>
                  </RequestNewVerificationEmail>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
