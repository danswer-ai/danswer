"use client";

import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { MailOpen } from "lucide-react";
import Link from "next/link";
import React from "react";

export const EnterVerification = () => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center">
        <div className="bg-primary p-5 rounded-md">
          <MailOpen size={40} stroke="white" />
        </div>
      </div>

      <div className="pt-8">
        <h1 className="text-2xl xl:text-3xl font-bold text-center text-dark-900">
          Email Verification
        </h1>
        <p className="text-center pt-2 text-sm text-subtle">
          We sent a code to johnnydoe@gmail.com
        </p>
      </div>

      <div className="pt-8 flex items-center flex-col gap-8 justify-center">
        <InputOTP maxLength={6}>
          <InputOTPGroup>
            <InputOTPSlot index={0} className="h-16 w-16 text-3xl font-bold" />
            <InputOTPSlot index={1} className="h-16 w-16 text-3xl font-bold" />
            <InputOTPSlot index={2} className="h-16 w-16 text-3xl font-bold" />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot index={3} className="h-16 w-16 text-3xl font-bold" />
            <InputOTPSlot index={4} className="h-16 w-16 text-3xl font-bold" />
            <InputOTPSlot index={5} className="h-16 w-16 text-3xl font-bold" />
          </InputOTPGroup>
        </InputOTP>

        <Button className="w-full">Continue</Button>

        <p className="text-center text-sm">
          Didn’t receive the email?{" "}
          <Link
            href=""
            className="text-sm font-medium text-link hover:underline"
          >
            Click to resend
          </Link>
        </p>
      </div>

      <div className="flex pt-6">
        <Link
          href="/auth/login"
          className="text-sm font-medium text-link hover:underline mx-auto"
        >
          Back to Sign In
        </Link>
      </div>
    </div>
  );
};
