"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronLeft, CircleCheck, RectangleEllipsis } from "lucide-react";
import Link from "next/link";
import React from "react";

export const SetNewPassword = ({
  goToNextStep,
}: {
  goToNextStep: () => void;
}) => {
  return (
    <div className="w-full">
      <div className="flex items-center justify-center">
        <div className="bg-primary p-5 rounded-md">
          <RectangleEllipsis size={40} stroke="white" />
        </div>
      </div>

      <h1 className="pt-8 text-2xl xl:text-3xl font-bold text-center text-dark-900">
        Set new password
      </h1>

      <form className="w-full pt-8">
        <div>
          <Label
            htmlFor="password"
            className="text-sm font-semibold leading-none"
          >
            Password
          </Label>
          <Input
            id="password"
            name="password"
            type="password"
            placeholder="Enter your new password"
          />
        </div>

        <div className="pt-4">
          <div>
            <Label
              htmlFor="confirm_password"
              className="text-sm font-semibold leading-none"
            >
              Confirm Password
            </Label>
            <Input
              id="confirm_password"
              name="confirm_password"
              type="confirm_password"
              placeholder="Enter your new password"
            />
          </div>

          <div className="text-sm text-subtle pt-4">
            <div className="flex items-center gap-2">
              <CircleCheck size={16} />
              <p>At least 8 characters</p>
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck size={16} />
              <p>At least 1 Capital letter</p>
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck size={16} />
              <p>At least 1 number or special character</p>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full mt-6" onClick={goToNextStep}>
          Continue
        </Button>
      </form>

      <div className="flex pt-6">
        <Link
          href="/auth/login"
          className="text-sm font-medium text-link hover:underline mx-auto flex items-center gap-2"
        >
          <ChevronLeft size={16} /> Back to Login
        </Link>
      </div>
    </div>
  );
};
