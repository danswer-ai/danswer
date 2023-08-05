"use client";

import { LoadingAnimation } from "@/components/Loading";
import { KeyIcon, TrashIcon } from "@/components/icons/icons";
import { ApiKeyForm } from "@/components/openai/ApiKeyForm";
import { GEN_AI_API_KEY_URL } from "@/components/openai/constants";
import { fetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";

const ExistingKeys = () => {
  const { data, isLoading, error } = useSWR<{ api_key: string }>(
    GEN_AI_API_KEY_URL,
    fetcher
  );

  if (isLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  if (error) {
    return <div className="text-red-600">Error loading existing keys</div>;
  }

  if (!data?.api_key) {
    return null;
  }

  return (
    <div>
      <h2 className="text-lg font-bold mb-2">Existing Key</h2>
      <div className="flex mb-1">
        <p className="text-sm italic my-auto">sk- ****...**{data?.api_key}</p>
        <button
          className="ml-1 my-auto hover:bg-gray-700 rounded-full p-1"
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
    <div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <KeyIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">OpenAI Keys</h1>
      </div>

      <ExistingKeys />

      <h2 className="text-lg font-bold mb-2">Update Key</h2>
      <p className="text-sm mb-2">
        Specify an OpenAI API key and click the &quot;Submit&quot; button.
      </p>
      <div className="border rounded-md border-gray-700 p-3">
        <ApiKeyForm
          handleResponse={(response) => {
            if (response.ok) {
              mutate(GEN_AI_API_KEY_URL);
            }
          }}
        />
      </div>
    </div>
  );
};

export default Page;
