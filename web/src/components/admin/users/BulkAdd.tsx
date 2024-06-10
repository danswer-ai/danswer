"use client";
import { RobotIcon } from "@/components/icons/icons";
import { Formik, Form, Field } from "formik";

import { BackButton } from "@/components/BackButton";
import { Card } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchPersonaEditorInfoSS";
import { Button, Text } from "@tremor/react";

const BulkAdd = () => (
  <Formik
    initialValues={{ emails: "" }}
    onSubmit={(values) => {
      alert(values.emails);
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

export default BulkAdd;
