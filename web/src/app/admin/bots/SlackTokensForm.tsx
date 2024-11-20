"use client";

import { TextFormField } from "@/components/admin/connectors/Field";
import { Form, Formik } from "formik";
import * as Yup from "yup";
import { createSlackBot, updateSlackBot } from "./new/lib";
import { Button } from "@/components/ui/button";
import { SourceIcon } from "@/components/SourceIcon";

export const SlackTokensForm = ({
  isUpdate,
  initialValues,
  existingSlackBotId,
  refreshSlackBot,
  setPopup,
  router,
}: {
  isUpdate: boolean;
  initialValues: any;
  existingSlackBotId?: number;
  refreshSlackBot?: () => void;
  setPopup: (popup: { message: string; type: "error" | "success" }) => void;
  router: any;
}) => (
  <Formik
    initialValues={initialValues}
    validationSchema={Yup.object().shape({
      bot_token: Yup.string().required(),
      app_token: Yup.string().required(),
      name: Yup.string().required(),
    })}
    onSubmit={async (values, formikHelpers) => {
      formikHelpers.setSubmitting(true);

      let response;
      if (isUpdate) {
        response = await updateSlackBot(existingSlackBotId!, values);
      } else {
        response = await createSlackBot(values);
      }
      formikHelpers.setSubmitting(false);
      if (response.ok) {
        if (refreshSlackBot) {
          refreshSlackBot();
        }
        const responseJson = await response.json();
        const botId = isUpdate ? existingSlackBotId : responseJson.id;
        setPopup({
          message: isUpdate
            ? "Successfully updated Slack Bot!"
            : "Successfully created Slack Bot!",
          type: "success",
        });
        router.push(`/admin/bots/${botId}}`);
      } else {
        const responseJson = await response.json();
        const errorMsg = responseJson.detail || responseJson.message;
        setPopup({
          message: isUpdate
            ? `Error updating Slack Bot - ${errorMsg}`
            : `Error creating Slack Bot - ${errorMsg}`,
          type: "error",
        });
      }
    }}
    enableReinitialize={true}
  >
    {({ isSubmitting, setFieldValue, values }) => (
      <Form className="w-full">
        {!isUpdate && (
          <div className="flex items-center gap-2 mb-4">
            <div className="my-auto">
              <SourceIcon iconSize={36} sourceType={"slack"} />
            </div>
            <TextFormField name="name" label="Slack Bot Name" type="text" />
          </div>
        )}

        {!isUpdate && (
          <div className="mb-4">
            Please enter your Slack Bot Token and Slack App Token to give
            Danswerbot access to your Slack!
          </div>
        )}
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
        <div className="flex justify-end w-full mt-4">
          <Button
            type="submit"
            disabled={isSubmitting}
            variant="submit"
            size="default"
          >
            {isUpdate ? "Update!" : "Create!"}
          </Button>
        </div>
      </Form>
    )}
  </Formik>
);
