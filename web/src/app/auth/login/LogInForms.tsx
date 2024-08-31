"use client";

import { TextFormField } from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { basicLogin, basicSignup } from "@/lib/user";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import { requestEmailVerification } from "../lib";
import { useState } from "react";
import { Spinner } from "@/components/Spinner";
import { Button } from "@/components/ui/button";

export function LogInForms({}: {}) {
  const router = useRouter();
  const { popup, setPopup } = usePopup();
  const [isWorking, setIsWorking] = useState(false);

  return (
    <>
      {isWorking && <Spinner />}
      {popup}
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
            setPopup({
              type: "error",
              message: `Failed to login - ${errorMsg}`,
            });
          }
        }}
      >
        {({ isSubmitting, values }) => (
          <Form>
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

            <div className="flex">
              <Button type="submit" disabled={isSubmitting} className="w-full">
                Log In
              </Button>
            </div>
          </Form>
        )}
      </Formik>
    </>
  );
}
