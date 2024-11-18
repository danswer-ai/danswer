import { BackButton } from "@/components/BackButton";
import { NewSlackAppForm } from "../SlackAppCreationForm";

async function NewSlackAppPage() {
  return (
    <div className="container mx-auto">
      <BackButton routerOverride="/admin/bot" />

      <NewSlackAppForm />
    </div>
  );
}

export default NewSlackAppPage;
