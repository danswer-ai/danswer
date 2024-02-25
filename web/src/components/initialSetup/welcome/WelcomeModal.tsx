"use client";

import { Button, Divider, Text } from "@tremor/react";
import { Modal } from "../../Modal";
import Link from "next/link";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { COMPLETED_WELCOME_FLOW_COOKIE } from "./constants";
import { FiCheckCircle, FiMessageSquare, FiShare2 } from "react-icons/fi";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { ApiKeyForm } from "@/components/openai/ApiKeyForm";
import { checkApiKey } from "@/components/openai/ApiKeyModal";

import { useTranslation } from "react-i18next";

function setWelcomeFlowComplete() {
  Cookies.set(COMPLETED_WELCOME_FLOW_COOKIE, "true", { expires: 365 });
}

export function _CompletedWelcomeFlowDummyComponent() {
  setWelcomeFlowComplete();
  return null;
}

function UsageTypeSection({
  title,
  description,
  callToAction,
  icon,
  onClick,
}: {
  title: string;
  description: string | JSX.Element;
  callToAction: string;
  icon?: React.ElementType;
  onClick: () => void;
}) {
  return (
    <div>
      <Text className="font-bold">{title}</Text>
      <div className="text-base mt-1 mb-3">{description}</div>
      <div
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        <div className="text-link font-medium cursor-pointer select-none">
          {callToAction}
        </div>
      </div>
    </div>
  );
}

export function _WelcomeModal() {
  const { t } = useTranslation();

  const router = useRouter();
  const [selectedFlow, setSelectedFlow] = useState<null | "search" | "chat">(
    null
  );
  const [isHidden, setIsHidden] = useState(false);
  const [apiKeyVerified, setApiKeyVerified] = useState<boolean>(false);

  useEffect(() => {
    checkApiKey().then((error) => {
      if (!error) {
        setApiKeyVerified(true);
      }
    });
  }, []);

  if (isHidden) {
    return null;
  }

  let title;
  let body;
  switch (selectedFlow) {
    case "search":
      title = undefined;
      body = (
        <>
          <BackButton behaviorOverride={() => setSelectedFlow(null)} />
          <div className="mt-3">
            <Text className="font-bold mt-6 mb-2 flex">
              {apiKeyVerified && (
                <FiCheckCircle className="my-auto mr-2 text-success" />
              )}
              {t("Step 1: Provide OpenAI API Key")}
            </Text>
            <div>
              {apiKeyVerified ? (
                <div>
                  {t("API Key setup complete!")}
                  <br /> <br />
                  {t(
                    "If you want to change the key later, you&apos;ll be able to easily to do so in the Admin Panel."
                  )}
                </div>
              ) : (
                <ApiKeyForm
                  handleResponse={async (response) => {
                    if (response.ok) {
                      setApiKeyVerified(true);
                    }
                  }}
                />
              )}
            </div>
            <Text className="font-bold mt-6 mb-2">
              {t("Step 2: Connect Data Sources")}
            </Text>
            <div>
              <p>{t("Step 2: Connect Data Sources - description ")}</p>

              <div className="flex mt-3">
                <Link
                  href="/admin/add-connector"
                  onClick={(e) => {
                    e.preventDefault();
                    setWelcomeFlowComplete();
                    router.push("/admin/add-connector");
                  }}
                  className="w-fit mx-auto"
                >
                  <Button size="xs" icon={FiShare2} disabled={!apiKeyVerified}>
                    {t("Setup your first connector!")}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </>
      );
      break;
    case "chat":
      title = undefined;
      body = (
        <>
          <BackButton behaviorOverride={() => setSelectedFlow(null)} />

          <div className="mt-3">
            <div>
              {t("To start using Danswer as a secure ChatGPT...")}
              <br />
              <br />
              {t(
                "Danswer supports connections with a wide range of LLMs..."
              )}{" "}
              <a
                className="text-link"
                href="https://docs.danswer.dev/gen_ai_configs/overview"
              >
                {t("documentation")}
              </a>
              .
              <br />
              <br />
              {t("If...we default to use OpenAI")}
            </div>

            <Text className="font-bold mt-6 mb-2 flex">
              {apiKeyVerified && (
                <FiCheckCircle className="my-auto mr-2 text-success" />
              )}
              {t("Step 1: Provide LLM API Key")}
            </Text>
            <div>
              {apiKeyVerified ? (
                <div>
                  {t("LLM setup complete!")}
                  <br /> <br />
                  {t(
                    "If you want to change the key later or choose a different LLM..."
                  )}
                </div>
              ) : (
                <ApiKeyForm
                  handleResponse={async (response) => {
                    if (response.ok) {
                      setApiKeyVerified(true);
                    }
                  }}
                />
              )}
            </div>

            <Text className="font-bold mt-6 mb-2 flex">
              {t("Step 2: Start Chatting!")}
            </Text>

            <div>
              {t(
                "Click the button below to start chatting with the LLM setup above!..."
              )}{" "}
              <Link
                className="text-link"
                href="/admin/add-connector"
                onClick={(e) => {
                  e.preventDefault();
                  setWelcomeFlowComplete();
                  router.push("/admin/add-connector");
                }}
              >
                {t("Admin Panel")}
              </Link>
              .
            </div>

            <div className="flex mt-3">
              <Link
                href="/chat"
                onClick={(e) => {
                  e.preventDefault();
                  setWelcomeFlowComplete();
                  router.push("/chat");
                  setIsHidden(true);
                }}
                className="w-fit mx-auto"
              >
                <Button size="xs" icon={FiShare2} disabled={!apiKeyVerified}>
                  {t("Start chatting!")}
                </Button>
              </Link>
            </div>
          </div>
        </>
      );
      break;
    default:
      title = "🎉 " + t("Welcome to Danswer");
      body = (
        <>
          <div>
            <p>{t("How are you planning on using Danswer?")}</p>
          </div>
          <Divider />
          <UsageTypeSection
            title={t("Search / Chat with Knowledge")}
            description={
              <div>{t("Search / Chat with Knowledge - description")}</div>
            }
            callToAction={t("Get Started")}
            onClick={() => setSelectedFlow("search")}
          />
          <Divider />
          <UsageTypeSection
            title={t("Secure ChatGPT")}
            description={<>{t("Secure ChatGPT - description")}</>}
            icon={FiMessageSquare}
            callToAction={t("Get Started")}
            onClick={() => {
              setSelectedFlow("chat");
            }}
          />

          {/* TODO: add a Slack option here */}
          {/* <Divider />
          <UsageTypeSection
            title="AI-powered Slack Assistant"
            description="If you're looking to setup a bot to auto-answer questions in Slack"
            callToAction="Connect your company knowledge!"
            link="/admin/add-connector"
          /> */}
        </>
      );
  }

  return (
    <Modal title={title} className="max-w-4xl">
      <div className="text-base">{body}</div>
    </Modal>
  );
}
