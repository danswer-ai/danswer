"use client";
import useSWRMutation from "swr/mutation";
import { RobotIcon } from "@/components/icons/icons";
import { Formik, Form, Field } from "formik";

import { BackButton } from "@/components/BackButton";
import { Card } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchPersonaEditorInfoSS";
import { Button, Text } from "@tremor/react";

const addUsers = async (url: string, { arg }: { arg: Array<string> }) => {
  return await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ users: arg }),
  });
};

const BulkAdd = () => {
  const { trigger } = useSWRMutation("/api/manage/admin/users", addUsers);
  return (
    <Formik
      initialValues={{ emails: "" }}
      onSubmit={async (values) => {
        const emails = values.emails.split(/\s+/);
        await trigger(emails);
      }}
    >
      <Form>
        <div className="flex flex-col gap-y-4">
          <Field id="emails" name="emails" as="textarea" className="p-4" />
          <Button className="mx-auto" color="green" size="md" type="submit">
            Add!
          </Button>
        </div>
      </Form>
    </Formik>
  );
};

export default BulkAdd;
