"use client";

import { Button, Text } from "@tremor/react";
import { Modal } from "./Modal";
import Link from "next/link";
import { FiCheckCircle } from "react-icons/fi";
import { checkModelNameIsValid } from "@/app/admin/models/embedding/embeddingModels";

export function WelcomeModal({
  embeddingModelName,
}: {
  embeddingModelName: undefined | null | string;
}) {
  const validModelSelected = checkModelNameIsValid(embeddingModelName);

  return (
    <Modal className="max-w-4xl">
      <div className="text-base">
        <h2 className="text-xl font-bold mb-4 pb-2 border-b border-border flex">
          Welcome to Danswer 🎉
        </h2>
        <div>
          <p>
            Danswer is the AI-powered search engine for your organization&apos;s
            internal knowledge. Whenever you need to find any piece of internal
            information, Danswer is there to help!
          </p>
        </div>
        <div className="flex mt-8 mb-2">
          {validModelSelected && (
            <FiCheckCircle className="my-auto mr-2 text-success" />
          )}
          <Text className="font-bold">Step 1: Choose Your Embedding Model</Text>
        </div>
        {!validModelSelected && (
          <>
            To get started, the first step is to choose your{" "}
            <i>embedding model</i>. This machine learning model helps power
            Danswer&apos;s search. Different models have different strengths,
            but don&apos;t worry we&apos;ll guide you through the process of
            choosing the right one for your organization.
          </>
        )}
        <div className="flex mt-3">
          <Link href="/admin/models/embedding">
            <Button size="xs">
              {validModelSelected
                ? "Change your Embedding Model"
                : "Choose your Embedding Model"}
            </Button>
          </Link>
        </div>
        <Text className="font-bold mt-8 mb-2">
          Step 2: Add Your First Connector
        </Text>
        Next, we need to to configure some <i>connectors</i>. Connectors are the
        way that Danswer gets data from your organization&apos;s various data
        sources. Once setup, we&apos;ll automatically sync data from your apps
        and docs into Danswer, so you can search all through all of them in one
        place.
        <div className="flex mt-3">
          <Link href="/admin/add-connector">
            <Button size="xs" disabled={!validModelSelected}>
              Setup your first connector!
            </Button>
          </Link>
        </div>
      </div>
    </Modal>
  );
}
