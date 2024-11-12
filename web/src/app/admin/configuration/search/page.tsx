"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { Text, Title } from "@tremor/react";
import useSWR from "swr";
import { ModelPreview } from "../../../../components/embedding/ModelSelector";
import {
  HostedEmbeddingModel,
  CloudEmbeddingModel,
} from "@/components/embedding/interfaces";

import { ErrorCallout } from "@/components/ErrorCallout";

export interface EmbeddingDetails {
  api_key: string;
  custom_config: any;
  default_model_id?: number;
  name: string;
}
import { EmbeddingIcon } from "@/components/icons/icons";

import Link from "next/link";
import { SavedSearchSettings } from "../../embeddings/interfaces";
import UpgradingPage from "./UpgradingPage";
import { useContext } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileSearch } from "lucide-react";

function Main() {
  const settings = useContext(SettingsContext);
  const {
    data: currentEmeddingModel,
    isLoading: isLoadingCurrentModel,
    error: currentEmeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    "/api/search-settings/get-current-search-settings",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const { data: searchSettings, isLoading: isLoadingSearchSettings } =
    useSWR<SavedSearchSettings | null>(
      "/api/search-settings/get-current-search-settings",
      errorHandlingFetcher,
      { refreshInterval: 5000 } // 5 seconds
    );

  const {
    data: futureEmbeddingModel,
    isLoading: isLoadingFutureModel,
    error: futureEmeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    "/api/search-settings/get-secondary-search-settings",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  if (
    isLoadingCurrentModel ||
    isLoadingFutureModel ||
    isLoadingSearchSettings
  ) {
    return <ThreeDotsLoader />;
  }

  if (
    currentEmeddingModelError ||
    !currentEmeddingModel ||
    futureEmeddingModelError
  ) {
    return <ErrorCallout errorTitle="Failed to fetch embedding model status" />;
  }

  return (
    <div className="h-full">
      {!futureEmbeddingModel ? (
        <>
          {settings?.settings.needs_reindexing && (
            <p className="max-w-3xl">
              Your search settings are currently out of date. We recommend
              updating your search settings and re-indexing.
            </p>
          )}
          <Title className="mb-6 mt-8 !text-2xl">Embedding Model</Title>

          {currentEmeddingModel ? (
            <ModelPreview model={currentEmeddingModel} display />
          ) : (
            <Title className="mt-8 mb-2">Choose your Embedding Model</Title>
          )}

          <Title className="mb-2 mt-8 !text-2xl">Post-processing</Title>

          <Card className="!mr-auto mt-8 !w-96">
            <CardContent>
              {searchSettings && (
                <>
                  <div className="w-full px-1 rounded-lg">
                    <div className="space-y-4">
                      <div>
                        <Text className="font-semibold">Reranking Model</Text>
                        <Text className="text-gray-700">
                          {searchSettings.rerank_model_name || "Not set"}
                        </Text>
                      </div>

                      <div>
                        <Text className="font-semibold">Results to Rerank</Text>
                        <Text className="text-gray-700">
                          {searchSettings.num_rerank}
                        </Text>
                      </div>

                      <div>
                        <Text className="font-semibold">
                          Multilingual Expansion
                        </Text>
                        <Text className="text-gray-700">
                          {searchSettings.multilingual_expansion.length > 0
                            ? searchSettings.multilingual_expansion.join(", ")
                            : "None"}
                        </Text>
                      </div>

                      <div>
                        <Text className="font-semibold">
                          Multipass Indexing
                        </Text>
                        <Text className="text-gray-700">
                          {searchSettings.multipass_indexing
                            ? "Enabled"
                            : "Disabled"}
                        </Text>
                      </div>

                      <div>
                        <Text className="font-semibold">
                          Disable Reranking for Streaming
                        </Text>
                        <Text className="text-gray-700">
                          {searchSettings.disable_rerank_for_streaming
                            ? "Yes"
                            : "No"}
                        </Text>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Link href="/admin/embeddings">
            <Button className="mt-8">Update Search Settings</Button>
          </Link>
        </>
      ) : (
        <UpgradingPage futureEmbeddingModel={futureEmbeddingModel} />
      )}
    </div>
  );
}

function Page() {
  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container mx-auto">
        <AdminPageTitle
          title="Search Settings"
          icon={<FileSearch size={32} className="my-auto" />}
        />
        <Main />
      </div>
    </div>
  );
}

export default Page;
