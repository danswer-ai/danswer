"use client";

import { useState } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import { useToast } from "@/hooks/use-toast";
import { basicSignup } from "@/lib/user";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/Spinner";
import { TextFormField } from "@/components/admin/connectors/Field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { PasswordRequirements } from "./PasswordRequirements";
import { usePasswordValidation } from "@/hooks/usePasswordValidation"; // Import the custom hook

export function SignupForms({ shouldVerify }: { shouldVerify?: boolean }) {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Use the custom hook
  const {
    passwordStrength,
    passwordFocused,
    passwordFeedback,
    passwordWarning,
    hasUppercase,
    hasNumberOrSpecialChar,
    calculatePasswordStrength,
    setPasswordFocused,
  } = usePasswordValidation();

  return (
    <>
      {isLoading && <Spinner />}
      <Formik
        initialValues={{
          full_name: "",
          company_name: "",
          email: "",
          password: "",
          confirm_password: "",
        }}
        validationSchema={Yup.object().shape({
          full_name: Yup.string().min(3).max(70).required(),
          company_name: Yup.string().required(),
          email: Yup.string().email().required("Email is required"),
          password: Yup.string().required("Password is required").min(8),
          confirm_password: Yup.string()
            .required("Confirm password is required")
            .oneOf([Yup.ref("password")], "Passwords must match"),
        })}
        onSubmit={async (values) => {
          if (
            !(
              values.password.length >= 8 &&
              hasUppercase &&
              hasNumberOrSpecialChar
            )
          ) {
            setPasswordFocused(true);
            toast({
              title: "Password doesn't meet requirements",
              description: "Ensure your password meets all the criteria.",
              variant: "destructive",
            });
            return;
          }

          setIsLoading(true);
          const response = await basicSignup(
            values.full_name,
            values.company_name,
            values.email,
            values.password
          );
          if (!response.ok) {
            setIsLoading(false);
            const errorDetail = (await response.json()).detail;

            let errorMsg = "Unknown error";
            if (errorDetail === "REGISTER_USER_ALREADY_EXISTS") {
              errorMsg = "An account already exists with the specified email.";
            }
            toast({
              title: "Error",
              description: `Failed to sign up - ${errorMsg}`,
              variant: "destructive",
            });

            setPasswordFocused(true);
            return;
          }
          setIsLoading(false);
          console.log(shouldVerify);
          if (shouldVerify) {
            router.push("/auth/waiting-on-verification");
          } else {
            router.push("/");
          }
        }}
      >
        {({ isSubmitting, values, setFieldValue }) => (
          <Form>
            <TextFormField
              name="full_name"
              label="Full name"
              type="text"
              placeholder="Enter your full name"
            />
            <TextFormField
              name="company_name"
              label="Company Name"
              type="text"
              placeholder="Enter your company name"
            />
            <TextFormField
              name="email"
              label="Email"
              type="email"
              placeholder="email@yourcompany.com"
            />

            <div className="relative">
              <TextFormField
                name="password"
                label="Password"
                type="password"
                placeholder="Enter your password"
                onChange={(e) => {
                  setFieldValue("password", e.target.value);
                  calculatePasswordStrength(e.target.value);
                }}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />

              {passwordFocused && (
                <PasswordRequirements
                  password={values.password}
                  hasUppercase={hasUppercase}
                  hasNumberOrSpecialChar={hasNumberOrSpecialChar}
                  passwordStrength={passwordStrength}
                  passwordFeedback={passwordFeedback}
                  passwordWarning={passwordWarning}
                />
              )}
            </div>

            <TextFormField
              name="confirm_password"
              label="Retype Password"
              type="password"
              placeholder="Enter your password"
            />

            <div className="flex items-center gap-2">
              <Checkbox id="remember" />
              <Label className="p-0" htmlFor="remember">
                Remember me
              </Label>
            </div>

            <div className="flex pt-8">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                Sign Up
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
