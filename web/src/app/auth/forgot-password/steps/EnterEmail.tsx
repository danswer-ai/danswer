"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Fingerprint } from "lucide-react";
import Link from "next/link";
import React from "react";

export const EnterEmail = ({ goToNextStep }: { goToNextStep: () => void }) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center">
        <div className="bg-primary p-5 rounded-md">
          <Fingerprint size={40} stroke="white" />
        </div>
      </div>

      <div className="pt-8">
        <h1 className="text-2xl xl:text-3xl font-bold text-center text-dark-900">
          Forgot Password?
        </h1>
        <p className="pt-2 text-center text-sm text-subtle">
          Enter your email to reset your password
        </p>
      </div>

      <form className="w-full pt-8">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
          />
        </div>

        <Button type="submit" className="w-full mt-6" onClick={goToNextStep}>
          Continue
        </Button>
      </form>

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
