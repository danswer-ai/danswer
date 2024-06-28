"use client";

import { usePopup } from "@/components/adminPageComponents/connectors/Popup";
import { requestEmailVerification } from "@/app/auth/lib";
import { Spinner } from "@/components/Spinner";
import { useState } from "react";

export function AuthSignupRequestVerificationButton({
  children,
  email,
}: {
  children: JSX.Element | string;
  email: string;
}) {
  const { popup, setPopup } = usePopup();
  const [isRequestingVerification, setIsRequestingVerification] = useState(false);

  async function requestVerification() {
    setIsRequestingVerification(true);
    try {
      const response = await requestEmailVerification(email);

      if (response.ok) {
        setPopup({
          type: "success",
          message: "A new verification email has been sent!",
        });
      } else {
        const errorDetail = (await response.json()).detail;
        setPopup({
          type: "error",
          message: `Failed to send a new verification email - ${errorDetail}`,
        });
      }
    } catch (error) {
      setPopup({
        type: "error",
        message: `An unexpected error occurred. Please try again later.`,
      });
    }
    setIsRequestingVerification(false);
  }

  return (
    <button
      className="text-link"
      onClick={requestVerification}
      disabled={isRequestingVerification}
    >
      {isRequestingVerification && <Spinner />}
      {children}
      {popup}
    </button>
  );
}
