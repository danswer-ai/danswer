"use client";
import React, { useState } from "react";
import { resetPassword } from "../forgot-password/utils";
import AuthFlowContainer from "@/components/auth/AuthFlowContainer";
import CardSection from "@/components/admin/CardSection";
import Title from "@/components/ui/title";
import Text from "@/components/ui/text";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { TextFormField } from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { Spinner } from "@/components/Spinner";
import { redirect, useSearchParams } from "next/navigation";
import { NEXT_PUBLIC_FORGOT_PASSWORD_ENABLED } from "@/lib/constants";

const ResetPasswordPage: React.FC = () => {
  const { popup, setPopup } = usePopup();
  const [isWorking, setIsWorking] = useState(false);
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  if (!NEXT_PUBLIC_FORGOT_PASSWORD_ENABLED) {
    redirect("/auth/login");
  }

  return (
    <AuthFlowContainer>
      <div className="flex flex-col w-full justify-center">
        <CardSection className="mt-4 w-full">
          <div className="flex">
            <Title className="mb-2 mx-auto font-bold">Reset Password</Title>
          </div>
          {isWorking && <Spinner />}
          {popup}
          <Formik
            initialValues={{
              password: "",
              confirmPassword: "",
            }}
            validationSchema={Yup.object().shape({
              password: Yup.string().required("Password is required"),
              confirmPassword: Yup.string()
                .oneOf([Yup.ref("password"), undefined], "Passwords must match")
                .required("Confirm Password is required"),
            })}
            onSubmit={async (values) => {
              if (!token) {
                setPopup({
                  type: "error",
                  message: "Invalid or missing reset token.",
                });
                return;
              }
              setIsWorking(true);
              try {
                await resetPassword(token, values.password);
                setPopup({
                  type: "success",
                  message:
                    "Password reset successfully. Redirecting to login...",
                });
                setTimeout(() => {
                  redirect("/auth/login");
                }, 1000);
              } catch (error) {
                setPopup({
                  type: "error",
                  message: "An error occurred. Please try again.",
                });
              } finally {
                setIsWorking(false);
              }
            }}
          >
            {({ isSubmitting }) => (
              <Form className="w-full flex flex-col items-stretch mt-2">
                <TextFormField
                  name="password"
                  label="New Password"
                  type="password"
                  placeholder="Enter your new password"
                />
                <TextFormField
                  name="confirmPassword"
                  label="Confirm New Password"
                  type="password"
                  placeholder="Confirm your new password"
                />

                <div className="flex">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="mx-auto w-full"
                  >
                    Reset Password
                  </Button>
                </div>
              </Form>
            )}
          </Formik>
          <div className="flex">
            <Text className="mt-4 mx-auto">
              <Link href="/auth/login" className="text-link font-medium">
                Back to Login
              </Link>
            </Text>
          </div>
        </CardSection>
      </div>
    </AuthFlowContainer>
  );
};

export default ResetPasswordPage;
