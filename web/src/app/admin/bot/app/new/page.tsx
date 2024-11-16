import { BackButton } from "@/components/BackButton";
import { AdminPageTitle } from "@/components/admin/Title";
import { CPUIcon } from "@/components/icons/icons";
import { SlackAppCreationForm } from "../SlackAppCreationForm";

async function NewSlackAppPage() {
  return (
    <div className="container mx-auto">
      <BackButton routerOverride="/admin/bot" />

      <SlackAppCreationForm />
    </div>
  );
}

export default NewSlackAppPage;
