import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import {
  Text,
} from "@tremor/react";

import {
  FiSlack,
} from "react-icons/fi";
import { InstantSSRAutoRefresh } from "@/components/SSRAutoRefresh";
import SlackBotConfinguration from "@/components/adminPageComponents/slackbot/SlackBotConfinguration";


const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<FiSlack size={32} />}
        title="Slack Bot Configuration"
      />
      <InstantSSRAutoRefresh />

      <Text className="mb-2">
        Setup a Slack bot that connects to Danswer. Once setup, you will be able
        to ask questions to Danswer directly from Slack. Additionally, you can:
      </Text>

      <ul className="list-disc mt-2 ml-4 mb-2">
        <li>
          Setup DanswerBot to automatically answer questions in certain
          channels.
        </li>
        <li>
          Choose which document sets DanswerBot should answer from, depending
          on the channel the question is being asked.
        </li>
        <li>
          Directly message DanswerBot to search just as you would in the web
          UI.
        </li>
      </ul>

      <Text className="mb-6">
        Follow the{" "}
        <a
          className="text-blue-500"
          href="https://docs.danswer.dev/slack_bot_setup"
          target="_blank"
        >
          guide{" "}
        </a>
        found in the Danswer documentation to get started!
      </Text>
      <SlackBotConfinguration />
    </div>
  );
};

export default Page;
