"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR from "swr";
import { ModelPreview } from "../../../../components/embedding/ModelSelector";
import {
  HostedEmbeddingModel,
  CloudEmbeddingModel,
} from "@/components/embedding/interfaces";
import { ErrorCallout } from "@/components/ErrorCallout";
import Link from "next/link";
import { SavedSearchSettings } from "../../embeddings/interfaces";
import UpgradingPage from "./UpgradingPage";
import { useContext } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileSearch } from "lucide-react";

export interface EmbeddingDetails {
  api_key: string;
  custom_config: any;
  default_model_id?: number;
  name: string;
}

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
          <h3 className="text-2xl">Embedding Model</h3>

          {currentEmeddingModel ? (
            <ModelPreview model={currentEmeddingModel} display />
          ) : (
            <h3 className="mt-3 mb-2">Choose your Embedding Model</h3>
          )}

          <h3 className="mb-2 mt-8 text-2xl">Post-processing</h3>

          <Card className="!mr-auto mt-3 !w-96">
            <CardContent>
              {searchSettings && (
                <>
                  <div className="w-full px-1 rounded-lg">
                    <div className="space-y-4">
                      <div>
                        <p className="font-semibold">Reranking Model</p>
                        <p className="text-gray-700">
                          {searchSettings.rerank_model_name || "Not set"}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold">Results to Rerank</p>
                        <p className="text-gray-700">
                          {searchSettings.num_rerank}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold">Multilingual Expansion</p>
                        <p className="text-gray-700">
                          {searchSettings.multilingual_expansion.length > 0
                            ? searchSettings.multilingual_expansion.join(", ")
                            : "None"}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold">Multipass Indexing</p>
                        <p className="text-gray-700">
                          {searchSettings.multipass_indexing
                            ? "Enabled"
                            : "Disabled"}
                        </p>
                      </div>

                      <div>
                        <p className="font-semibold">
                          Disable Reranking for Streaming
                        </p>
                        <p className="text-gray-700">
                          {searchSettings.disable_rerank_for_streaming
                            ? "Yes"
                            : "No"}
                        </p>
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
