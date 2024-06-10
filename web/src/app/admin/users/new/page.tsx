import { RobotIcon } from "@/components/icons/icons";
import { Formik } from "formik";

import { BackButton } from "@/components/BackButton";
import { Card } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import { fetchAssistantEditorInfoSS } from "@/lib/assistants/fetchPersonaEditorInfoSS";
import { Button, Text } from "@tremor/react";
import BulkAdd from "@/components/admin/users/BulkAdd";

export default async function Page() {
  return (
    <div>
      <BackButton />

      <AdminPageTitle title="Add Users" icon={<RobotIcon size={32} />} />

      <div className="flex flex-col gap-y-4">
        <Text className="font-medium text-base">
          Add the email addresses to import, separated by whitespaces.
        </Text>
        <BulkAdd />
      </div>
    </div>
  );
}
