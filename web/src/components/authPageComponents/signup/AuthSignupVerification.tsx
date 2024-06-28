"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Text } from "@tremor/react";
import { AuthSignupRequestVerificationButton } from "@/components/authPageComponents/signup/AuthSignupRequestVerificationButton";
import { User } from "@/lib/types";

export function EmailVerificationComponent({ user }: { user: User | null }) {
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
    <>
      {!error ? (
        <Text className="mt-2">Verifying your email...</Text>
      ) : (
        <div>
          <Text className="mt-2">{error}</Text>

          {user && (
            <div className="text-center">
              <AuthSignupRequestVerificationButton email={user.email}>
                <Text className="mt-2 text-link">
                  Get new verification email
                </Text>
              </AuthSignupRequestVerificationButton>
            </div>
          )}
        </div>
      )}
    </>
  );
}
