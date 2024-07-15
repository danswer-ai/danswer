import { AdminPageTitle } from "@/components/admin/Title";
import { FiSettings } from "react-icons/fi";
import { SettingsForm } from "./SettingsForm";
import { Text } from "@tremor/react";

export default async function Page() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Workspace Settings"
        icon={<FiSettings size={32} className="my-auto" />}
      />

      <Text className="mb-8">
        Manage general Danswer settings applicable to all users in the
        workspace.
      </Text>

      <SettingsForm />
    </div>
  );
}
