"use client";

import { WelcomeTopBar } from "@/components/TopBar";
import { Button } from "@/components/ui/button";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSeparator,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { ShieldEllipsis } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const Page = () => {
  const [value, setValue] = useState("");

  return (
    <main className="h-full">
      <WelcomeTopBar />
      <div className="w-full h-full flex items-center justify-center px-6">
        <div className="md:w-[500px]">
          <div className="flex items-center justify-center">
            <div className="bg-primary p-3 rounded-md">
              <ShieldEllipsis size={60} stroke="white" />
            </div>
          </div>

          <div className="pt-8">
            <h1 className="text-2xl xl:text-3xl font-bold text-center text-dark-900">
              Setup Two-Factor Authentication
            </h1>
            <p className="text-center pt-2 text-sm text-subtle">
              Please check your email a 6 digit code has been sent to your
              registered email{" "}
              <span className="font-semibold text-default">
                “john.doe@gmail.com”
              </span>
            </p>
          </div>

          <div className="pt-8 flex items-center flex-col gap-8 justify-center">
            <InputOTP
              maxLength={6}
              value={value}
              onChange={(value) => setValue(value)}
            >
              <InputOTPGroup>
                <InputOTPSlot
                  index={0}
                  className="w-10 h-10 md:h-16 md:w-16 text-3xl font-bold"
                />
                <InputOTPSlot
                  index={1}
                  className="w-10 h-10 md:h-16 md:w-16 text-3xl font-bold"
                />
                <InputOTPSlot
                  index={2}
                  className="w-10 h-10 md:h-16 md:w-16 text-3xl font-bold"
                />
              </InputOTPGroup>
              <InputOTPSeparator />
              <InputOTPGroup>
                <InputOTPSlot
                  index={3}
                  className="w-10 h-10 md:h-16 md:w-16 text-3xl font-bold"
                />
                <InputOTPSlot
                  index={4}
                  className="w-10 h-10 md:h-16 md:w-16 text-3xl font-bold"
                />
                <InputOTPSlot
                  index={5}
                  className="w-10 h-10 md:h-16 md:w-16 text-3xl font-bold"
                />
              </InputOTPGroup>
            </InputOTP>

            <Button className="w-full">Continue</Button>

            <p className="text-center text-sm">
              Didn’t receive a code?{" "}
              <Link
                href=""
                className="text-sm font-medium text-link hover:underline"
              >
                Resend Code
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Page;
