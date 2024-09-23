"use client";

import { Button } from "@/components/ui/button";
import { PartyPopper } from "lucide-react";
import Link from "next/link";
import React from "react";

export const SuccessChangePassword = () => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center">
        <div className="bg-primary p-5 rounded-md">
          <PartyPopper size={40} stroke="white" />
        </div>
      </div>

      <div className="pt-8 text-sm text-subtle">
        <h1 className="text-2xl xl:text-3xl font-bold text-center text-dark-900">
          All done!
        </h1>
        <p className="text-center pt-2">
          Your password has been successfully reset.
        </p>
        <p className="text-center">Click below to log in.</p>
      </div>

      <Link href="/auth/login">
        <Button type="submit" className="w-full mt-6">
          Continue
        </Button>
      </Link>
    </div>
  );
};
