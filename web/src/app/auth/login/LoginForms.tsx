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
            router.push("/");
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
              placeholder="email@yourcompany.com"
            />

            <TextFormField
              name="password"
              label="Password"
              type="password"
              placeholder="**************"
            />

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="remember" />
                <Label className="p-0" htmlFor="remember">
                  Remember me
                </Label>
              </div>
              <Button variant="link" className="p-0 h-auto">
                Forgot password?
              </Button>
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

            <div className="flex items-center gap-6 pt-8 w-full">
              <Button className="flex-1 truncate" variant="outline">
                <div className="truncate flex items-center gap-2">
                  <Image
                    src={GmailIcon}
                    alt="gmail-icon"
                    width={16}
                    height={16}
                  />{" "}
                  Continue with Gmail
                </div>
              </Button>
              <Button
                className="flex-1 truncate"
                variant="outline"
                type="button"
              >
                <div className="truncate flex items-center gap-2">
                  <Image
                    src={MicrosoftIcon}
                    alt="microsoft-icon"
                    width={16}
                    height={16}
                  />
                  Continue with Microsoft
                </div>
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
