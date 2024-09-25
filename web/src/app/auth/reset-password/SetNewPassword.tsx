"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, CircleCheck, RectangleEllipsis } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import React, { FormEvent, useEffect, useState } from "react";

export const SetNewPasswordForms = () => {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isMinLength, setIsMinLength] = useState(false);
  const [hasCapitalLetter, setHasCapitalLetter] = useState(false);
  const [hasNumberOrSpecialChar, setHasNumberOrSpecialChar] = useState(false);

  const handleOnSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!isMinLength || !hasCapitalLetter || !hasNumberOrSpecialChar) {
      toast({
        title: "Password doesn't meet requirements",
        description: "Ensure your password meets all the criteria.",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Please check your new and confirm password again",
        description: `Your new password and confirm password must be the same`,
        variant: "destructive",
      });
      setNewPassword("");
      setConfirmPassword("");
      return;
    }

    const response = await fetch("/api/auth/reset-password", {
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
      body: JSON.stringify({
        token: resetToken,
        password: newPassword,
      }),
    });

    if (response.status === 200) {
      router.push("/auth/reset-password/success");
    } else {
      toast({
        title: "Something went wrong",
        description: `Error: ${response.statusText}`,
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (resetToken == null) {
      router.push("/");
    }
  }, []);

  useEffect(() => {
    setIsMinLength(newPassword.length >= 8);
    setHasCapitalLetter(/[A-Z]/.test(newPassword));
    setHasNumberOrSpecialChar(/[0-9!@#$%^&*]/.test(newPassword));
  }, [newPassword]);

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

      <form onSubmit={handleOnSubmit} className="w-full pt-8">
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
            onChange={(e) => {
              setNewPassword(e.target.value);
            }}
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
              type="password"
              placeholder="Enter your new password"
              onChange={(e) => {
                setConfirmPassword(e.target.value);
              }}
            />
          </div>

          <div className="text-sm text-subtle pt-4">
            <div className="flex items-center gap-2">
              <CircleCheck size={16} color={isMinLength ? "#69c57d" : "gray"} />
              <p>At least 8 characters</p>
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck
                size={16}
                color={hasCapitalLetter ? "#69c57d" : "gray"}
              />
              <p>At least 1 Capital letter</p>
            </div>
            <div className="flex items-center gap-2">
              <CircleCheck
                size={16}
                color={hasNumberOrSpecialChar ? "#69c57d" : "gray"}
              />
              <p>At least 1 number or special character</p>
            </div>
          </div>
        </div>

        <Button type="submit" className="w-full mt-6">
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
