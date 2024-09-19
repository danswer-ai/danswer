import { AdminPageTitle } from "@/components/admin/Title";
import { FiSettings } from "react-icons/fi";
import { SettingsForm } from "./SettingsForm";
import { Text } from "@tremor/react";

export default async function Page() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          title="Workspace Settings"
          icon={<FiSettings size={32} className="my-auto" />}
        />

        <p className="mb-8">
          Manage general enMedD AI settings applicable to all users in the
          workspace.
        </p>

        <SettingsForm />
      </div>
    </div>
  );
}
