import { AdminPageTitle } from "@/components/admin/Title";
import { FiSettings } from "react-icons/fi";
import { SettingsForm } from "./SettingsForm";
import { Text } from "@tremor/react";

export default async function Page() {
  return (
    <div className="py-24 md:py-32 lg:pt-16">
      <AdminPageTitle
        title="Workspace Settings"
        icon={<FiSettings size={32} className="my-auto" />}
      />

      <Text className="mb-8">
        Manage general enMedD AI settings applicable to all users in the
        workspace.
      </Text>

      <SettingsForm />
    </div>
  );
}
