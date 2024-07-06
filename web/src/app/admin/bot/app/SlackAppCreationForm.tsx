"use client";

import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { SlackApp } from "@/lib/types";
import { Button, Card } from "@tremor/react";
import { Form, Formik } from "formik";
import { useRouter } from "next/navigation";
import * as Yup from "yup";
import { createSlackApp, updateSlackApp } from "./lib";

export const SlackAppCreationForm = ({
  existingSlackApp,
  refreshSlackApp,
}: {
  existingSlackApp?: SlackApp;
  refreshSlackApp?: () => void;
}) => {
  const isUpdate = existingSlackApp !== undefined;
  const { popup, setPopup } = usePopup();
  const router = useRouter();

  let initialValues;
  if (isUpdate) {
    initialValues = existingSlackApp;
  } else {
    initialValues = {
      name: "",
      description: "",
      enabled: true,
      bot_token: "",
      app_token: "",
    };
  }

  return (
    <div>
      <Card>
        {popup}
        <Formik
          initialValues={initialValues}
          validationSchema={Yup.object().shape({
            name: Yup.string().required(),
            description: Yup.string().optional(),
            enabled: Yup.boolean().required(),
            bot_token: Yup.string().required(),
            app_token: Yup.string().required(),
          })}
          onSubmit={async (values, formikHelpers) => {
            formikHelpers.setSubmitting(true);

            let response;
            if (isUpdate) {
              response = await updateSlackApp(existingSlackApp.id, values);
            } else {
              response = await createSlackApp(values);
            }
            formikHelpers.setSubmitting(false);
            if (response.ok) {
              if (refreshSlackApp) {
                refreshSlackApp();
              }
              router.push(`/admin/bot?u=${Date.now()}`);
            } else {
              const responseJson = await response.json();
              const errorMsg = responseJson.detail || responseJson.message;
              setPopup({
                message: isUpdate
                  ? `Error updating Slack App - ${errorMsg}`
                  : `Error creating Slack App - ${errorMsg}`,
                type: "error",
              });
            }
          }}
        >
          {({ isSubmitting, values }) => (
            <Form>
              <TextFormField name="name" label="Name of this Slack app" />
              <TextFormField
                name="description"
                label="Enter a description of this Slack app (optional)"
              />
              <TextFormField
                name="bot_token"
                label="Slack Bot Token"
                type="password"
              />
              <TextFormField
                name="app_token"
                label="Slack App Token"
                type="password"
              />
              <BooleanFormField
                name="enabled"
                label="Enabled"
                subtext="While enabled, this Slack app will run in the background"
              />
              <div className="flex">
                <Button type="submit" disabled={isSubmitting}>
                  {isUpdate ? "Update!" : "Create!"}
                </Button>
              </div>
            </Form>
          )}
        </Formik>
      </Card>
    </div>
  );
};
