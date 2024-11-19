import { BackButton } from "@/components/BackButton";
import { NewSlackBotForm } from "../SlackBotCreationForm";

async function NewSlackBotPage() {
  return (
    <div className="container mx-auto">
      <BackButton routerOverride="/admin/bot" />

      <NewSlackBotForm />
    </div>
  );
}

export default NewSlackBotPage;
