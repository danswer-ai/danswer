"use client";

import { Modal } from "../../Modal";
import Link from "next/link";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { COMPLETED_WELCOME_FLOW_COOKIE } from "./constants";
import { useEffect, useState } from "react";
import { BackButton } from "@/components/BackButton";
import { ApiKeyForm } from "@/components/llm/ApiKeyForm";
import { WellKnownLLMProviderDescriptor } from "@/app/admin/models/llm/interfaces";
import { checkLlmProvider } from "./lib";
import { User } from "@/lib/types";
import { CustomModal } from "@/components/CustomModal";
import { Button } from "@/components/ui/button";
import { CheckCircle, Share2 } from "lucide-react";
import { Divider } from "@/components/Divider";

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
  onClick,
}: {
  title: string;
  description: string | JSX.Element;
  callToAction: string;
  onClick: () => void;
}) {
  return (
    <div>
      <h3>{title}</h3>
      <div className="mt-1 mb-3 text-base">{description}</div>
      <Button
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
      >
        {callToAction}
      </Button>
    </div>
  );
}

export function _WelcomeModal({ user }: { user: User | null }) {
  const router = useRouter();
  const [selectedFlow, setSelectedFlow] = useState<null | "search" | "chat">(
    null
  );
  const [isHidden, setIsHidden] = useState(false);
  const [apiKeyVerified, setApiKeyVerified] = useState<boolean>(false);
  const [providerOptions, setProviderOptions] = useState<
    WellKnownLLMProviderDescriptor[]
  >([]);

  useEffect(() => {
    async function fetchProviderInfo() {
      const { providers, options, defaultCheckSuccessful } =
        await checkLlmProvider(user);
      setApiKeyVerified(providers.length > 0 && defaultCheckSuccessful);
      setProviderOptions(options);
    }

    fetchProviderInfo();
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
        <div className="max-h-[85vh] overflow-y-auto px-4 pb-4">
          <BackButton behaviorOverride={() => setSelectedFlow(null)} />
          <div className="mt-3">
            <p className="flex font-bold">
              {apiKeyVerified && (
                <CheckCircle className="my-auto mr-2 text-success" />
              )}
              Step 1: Setup an LLM
            </p>
            <div>
              {apiKeyVerified ? (
                <p className="mt-2">
                  LLM setup complete!
                  <br /> <br />
                  If you want to change the key later, you&apos;ll be able to
                  easily to do so in the Admin Panel.
                </p>
              ) : (
                <ApiKeyForm
                  onSuccess={() => setApiKeyVerified(true)}
                  providerOptions={providerOptions}
                />
              )}
            </div>
            <p className="mt-6 mb-2 font-bold">Step 2: Connect Data Sources</p>
            <div>
              <p>
                Connectors are the way that enMedD AI gets data from your
                organization&apos;s various data sources. Once setup, we&apos;ll
                automatically sync data from your apps and docs into enMedD AI,
                so you can search through all of them in one place.
              </p>

              <div className="flex mt-3">
                <Link
                  href="/admin/data-sources"
                  onClick={(e) => {
                    e.preventDefault();
                    setWelcomeFlowComplete();
                    router.push("/admin/data-sources");
                  }}
                  className="mx-auto w-fit"
                >
                  <Button disabled={!apiKeyVerified}>
                    <Share2 size={16} /> Setup your first connector!
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      );
      break;
    case "chat":
      title = undefined;
      body = (
        <div className="mt-3 max-h-[85vh] overflow-y-auto px-4 pb-4">
          <BackButton behaviorOverride={() => setSelectedFlow(null)} />

          <div className="mt-3">
            <p className="flex font-bold">
              {apiKeyVerified && (
                <CheckCircle className="my-auto mr-2 text-success" />
              )}
              Step 1: Setup an LLM
            </p>
            <div>
              {apiKeyVerified ? (
                <p className="mt-2">
                  LLM setup complete!
                  <br /> <br />
                  If you want to change the key later or choose a different LLM,
                  you&apos;ll be able to easily to do so in the Admin Panel.
                </p>
              ) : (
                <div>
                  <ApiKeyForm
                    onSuccess={() => setApiKeyVerified(true)}
                    providerOptions={providerOptions}
                  />
                </div>
              )}
            </div>

            <p className="flex mt-6 mb-2 font-bold">Step 2: Start Chatting!</p>

            <p>
              Click the button below to start chatting with the LLM setup above!
              Don&apos;t worry, if you do decide later on you want to connect
              your organization&apos;s knowledge, you can always do that in the{" "}
              <Link
                className="text-link"
                href="/admin/data-sources"
                onClick={(e) => {
                  e.preventDefault();
                  setWelcomeFlowComplete();
                  router.push("/admin/data-sources");
                }}
              >
                Admin Panel
              </Link>
              .
            </p>

            <div className="flex mt-3">
              <Link
                href="/chat"
                onClick={(e) => {
                  e.preventDefault();
                  setWelcomeFlowComplete();
                  router.push("/chat");
                  setIsHidden(true);
                }}
                className="mx-auto w-fit"
              >
                <Button disabled={!apiKeyVerified}>
                  <Share2 size={16} /> Start chatting!
                </Button>
              </Link>
            </div>
          </div>
        </div>
      );
      break;
    default:
      title = "🎉 Welcome to enMedD AI";
      body = (
        <>
          <div>
            <p>How are you planning on using enMedD AI?</p>
          </div>
          <Divider />
          <UsageTypeSection
            title="Search / Chat with Knowledge"
            description={
              <p>
                If you&apos;re looking to search through, chat with, or ask
                direct questions of your organization&apos;s knowledge, then
                this is the option for you!
              </p>
            }
            callToAction="Get Started"
            onClick={() => setSelectedFlow("search")}
          />
          <Divider />
          <UsageTypeSection
            title="Secure ChatGPT"
            description={
              <p>
                If you&apos;re looking for a pure ChatGPT-like experience, then
                this is the option for you!
              </p>
            }
            callToAction="Get Started"
            onClick={() => {
              setSelectedFlow("chat");
            }}
          />
        </>
      );
  }

  return (
    <Modal title={title} className="w-full max-w-4xl mx-6 md:w-auto md:mx-0">
      <CustomModal
        open={!isHidden}
        onClose={() => setIsHidden(true)}
        trigger={null}
        title={title}
      >
        <div>{body}</div>
      </CustomModal>
    </Modal>
  );
}
