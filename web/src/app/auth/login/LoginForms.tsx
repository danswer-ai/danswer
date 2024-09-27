"use client";

import { TextFormField } from "@/components/admin/connectors/Field";
import { basicLogin, basicSignup } from "@/lib/user";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import GmailIcon from "../../../../public/Gmail.png";
import MicrosoftIcon from "../../../../public/microsoft.svg";
import Image from "next/image";
import Link from "next/link";

export function LogInForms({}: {}) {
  const router = useRouter();
  const { toast } = useToast();
  const [isWorking, setIsWorking] = useState(false);

  return (
    <>
      {isWorking && <Spinner />}
      <Formik
        initialValues={{
          email: "",
          password: "",
        }}
        validationSchema={Yup.object().shape({
          email: Yup.string().email().required(),
          password: Yup.string().required(),
        })}
        onSubmit={async (values) => {
          const loginResponse = await basicLogin(values.email, values.password);
          if (loginResponse.ok) {
            router.push(`/auth/2factorverification/?email=${values.email}`);
            await fetch("/api/users/generate-otp", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            });
          } else {
            setIsWorking(false);
            const errorDetail = (await loginResponse.json()).detail;

            let errorMsg = "Unknown error";
            if (errorDetail === "LOGIN_BAD_CREDENTIALS") {
              errorMsg = "Invalid email or password";
            }
            toast({
              title: "Error",
              description: `Failed to login - ${errorMsg}`,
              variant: "destructive",
            });
          }
        }}
      >
        {({ isSubmitting, values }) => (
          <Form className="w-full">
            <TextFormField
              name="email"
              label="Email"
              type="email"
              placeholder="Enter your email"
            />

            <TextFormField
              name="password"
              label="Password"
              type="password"
              placeholder="Enter your password"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label className="p-0" htmlFor="remember">
                  Remember me
                </Label>
              </div>
              <Link
                href="/auth/forgot-password"
                className="text-sm font-medium text-link hover:underline"
              >
                Forgot password?
              </Link>
            </div>

            <div className="flex pt-10">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                Sign In
              </Button>
            </div>

            <div className="flex items-center gap-4 pt-8">
              <Separator className="flex-1" />
              <p className="whitespace-nowrap text-sm">Or login with</p>
              <Separator className="flex-1" />
            </div>

            <div className="flex items-center gap-3 md:gap-6 w-full flex-col md:flex-row pt-8">
              <Button className="flex-1 w-full" variant="outline">
                <Image
                  src={GmailIcon}
                  alt="gmail-icon"
                  width={16}
                  height={16}
                />{" "}
                Continue with Gmail
              </Button>
              <Button className="flex-1 w-full" variant="outline" type="button">
                <Image
                  src={MicrosoftIcon}
                  alt="microsoft-icon"
                  width={16}
                  height={16}
                />
                Continue with Microsoft
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
