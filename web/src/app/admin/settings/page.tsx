import { AdminPageTitle } from "@/components/admin/Title";
import { SettingsForm } from "./SettingsForm";
import { Settings } from "lucide-react";

export default async function Page() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <AdminPageTitle
          title="Workspace Settings"
          icon={<Settings size={32} className="my-auto" />}
        />
        <SettingsForm />
      </div>
    </div>
  );
}
