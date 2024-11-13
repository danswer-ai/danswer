import { BackButton } from "@/components/BackButton";
import { AdminPageTitle } from "@/components/admin/Title";
import { CPUIcon } from "@/components/icons/icons";
import { SlackAppCreationForm } from "../SlackAppCreationForm";

async function NewSlackAppPage() {
  return (
    <div className="container mx-auto">
      <BackButton />
      <AdminPageTitle icon={<CPUIcon size={32} />} title="New Slack App" />

      <p className="mb-6 text-muted-foreground">
        Define a new Slack app below. Follow the{" "}
        <a
          className="text-blue-500"
          href="https://docs.danswer.dev/slack_bot_setup"
          target="_blank"
        >
          guide{" "}
        </a>
        found in the Danswer documentation to get started!
      </p>

      <SlackAppCreationForm />
    </div>
  );
}

export default NewSlackAppPage;
