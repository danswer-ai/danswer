"use client";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { verifyToken } from "@/lib/auth"; // You'll need to implement this

export default function SSOCallback() {
  const router = useRouter();

  useEffect(() => {
    const { token } = router.query;
    if (token) {
      verifyToken(token as string)
        .then(() => {
          // Token is valid, redirect to dashboard
          router.push("/dashboard");
        })
        .catch((error: any) => {
          console.error("Invalid token:", error);
          // Handle invalid token (e.g., redirect to login page)
          router.push("/login");
        });
    }
  }, [router]);

  return <div>Authenticating...</div>;
}
