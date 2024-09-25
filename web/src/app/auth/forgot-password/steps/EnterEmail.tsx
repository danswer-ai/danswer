"use client";

import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Fingerprint } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import React, { useState } from "react";

export const EnterEmail = () => {
  const { toast } = useToast();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div className="w-full">
      {isLoading && <Spinner />}
      <div className="flex items-center justify-center">
        <div className="bg-primary p-3 rounded-md">
          <Fingerprint size={60} stroke="white" />
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

      <form
        onSubmit={async (e) => {
          setIsLoading(true);
          e.preventDefault();
          const payload = {
            email: email,
          };
          const response = await fetch("/api/auth/forgot-password", {
            headers: {
              "Content-Type": "application/json",
            },
            method: "POST",
            body: JSON.stringify(payload),
          });
          if (response.status == 202) {
            router.push("/auth/forgot-password/success");
          } else {
            toast({
              title: "Something went wrong",
              description: `Error: ${response.statusText}`,
              variant: "destructive",
            });
          }
          setIsLoading(false);
        }}
        className="w-full pt-8"
      >
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            placeholder="Enter your email"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full mt-6">
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
