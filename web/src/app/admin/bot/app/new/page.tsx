import { BackButton } from "@/components/BackButton";
import { AdminPageTitle } from "@/components/admin/Title";
import { CPUIcon } from "@/components/icons/icons";
import { Text } from "@tremor/react";
import { SlackAppCreationForm } from "../SlackAppCreationForm";

async function Page() {
  return (
    <div className="container mx-auto">
      <BackButton />
      <AdminPageTitle
        icon={<CPUIcon size={32} />}
        title="New Slack App"
      />

      <Text className="mb-6">
      Define a new Slack app below. Follow the{" "}
        <a
          className="text-blue-500"
          href="https://docs.danswer.dev/slack_bot_setup"
          target="_blank"
        >
          guide{" "}
        </a>
        found in the Danswer documentation to get started!
      </Text>

      <SlackAppCreationForm />
    </div>
  );
}

export default Page;
