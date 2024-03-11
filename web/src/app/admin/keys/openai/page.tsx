"use client";

import { LoadingAnimation } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { SectionHeader } from "@/components/admin/connectors/Field";
import { TrashIcon } from "@/components/icons/icons";
import { ApiKeyForm } from "@/components/openai/ApiKeyForm";
import { GEN_AI_API_KEY_URL } from "@/components/openai/constants";
import { fetcher } from "@/lib/fetcher";
import { Text, Title } from "@tremor/react";
import { FiCpu } from "react-icons/fi";
import useSWR, { mutate } from "swr";
import { LLMOptions } from "./LLMOptions";

const ExistingKeys = () => {
  const { data, isLoading, error } = useSWR<{ api_key: string }>(
    GEN_AI_API_KEY_URL,
    fetcher
  );

  if (isLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  if (error) {
    return <div className="text-error">Error loading existing keys</div>;
  }

  if (!data?.api_key) {
    return null;
  }

  return (
    <div>
      <Title className="mb-2">Existing Key</Title>
      <div className="flex mb-1">
        <p className="text-sm italic my-auto">sk- ****...**{data?.api_key}</p>
        <button
          className="ml-1 my-auto hover:bg-hover rounded p-1"
          onClick={async () => {
            await fetch(GEN_AI_API_KEY_URL, {
              method: "DELETE",
            });
            window.location.reload();
          }}
        >
          <TrashIcon />
        </button>
      </div>
    </div>
  );
};

const Page = () => {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="LLM Options"
        icon={<FiCpu size={32} className="my-auto" />}
      />

      <SectionHeader>LLM Keys</SectionHeader>

      <ExistingKeys />

      <Title className="mb-2 mt-6">Update Key</Title>
      <Text className="mb-2">
        Specify an OpenAI API key and click the &quot;Submit&quot; button.
      </Text>
      <div className="border rounded-md border-border p-3">
        <ApiKeyForm
          handleResponse={(response) => {
            if (response.ok) {
              mutate(GEN_AI_API_KEY_URL);
            }
          }}
        />
      </div>
      <LLMOptions />
    </div>
  );
};

export default Page;
