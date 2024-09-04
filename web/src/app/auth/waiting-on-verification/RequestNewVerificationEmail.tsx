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
            title: "Success",
            description: "A new verification email has been sent!",
            variant: "success",
          });
        } else {
          const errorDetail = (await response.json()).detail;

          toast({
            title: "Error",
            description: `Failed to send a new verification email - ${errorDetail}`,
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
