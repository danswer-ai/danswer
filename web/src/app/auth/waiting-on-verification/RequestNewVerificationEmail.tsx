"use client";

import { requestEmailVerification } from "../lib";
import { Spinner } from "@/components/Spinner";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

export function RequestNewVerificationEmail({
  children,
  email,
}: {
  children: JSX.Element | string;
  email: string;
}) {
  const [isRequestingVerification, setIsRequestingVerification] =
    useState(false);
  const { toast } = useToast();

  return (
    <button
      className="text-link"
      onClick={async () => {
        setIsRequestingVerification(true);
        const response = await requestEmailVerification(email);
        setIsRequestingVerification(false);

        if (response.ok) {
          toast({
            title: "Verification Email Sent",
            description:
              "We've sent a new verification email to your inbox. Please check your email.",
            variant: "success",
          });
        } else {
          const errorDetail = (await response.json()).detail;

          toast({
            title: "Email Verification Failed",
            description: `Unable to send verification email: ${errorDetail}. Please try again later.`,
            variant: "destructive",
          });
        }
      }}
    >
      {isRequestingVerification && <Spinner />}
      {children}
    </button>
  );
}
