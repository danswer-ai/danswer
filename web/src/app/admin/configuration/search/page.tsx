"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { errorHandlingFetcher } from "@/lib/fetcher";
import {
  Button,
  Divider,
  Select,
  SelectItem,
  Switch,
  Text,
  Title,
} from "@tremor/react";
import useSWR, { mutate } from "swr";
import { ModelPreview } from "./components/ModelSelector";
import { useState } from "react";
import { ReindexingProgressTable } from "./components/ReindexingProgressTable";
import { Modal } from "@/components/Modal";
import {
  CloudEmbeddingProvider,
  CloudEmbeddingModel,
  AVAILABLE_CLOUD_PROVIDERS,
  AVAILABLE_MODELS,
  INVALID_OLD_MODEL,
  HostedEmbeddingModel,
  EmbeddingModelDescriptor,
} from "./components/types";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ConnectorIndexingStatus } from "@/lib/types";
import { Connector } from "@/lib/connectors/connectors";
import { EMBEDDING_PROVIDERS_ADMIN_URL } from "../llm/constants";

export interface EmbeddingDetails {
  api_key: string;
  custom_config: any;
  default_model_id?: number;
  name: string;
}
import { EmbeddingIcon, PackageIcon } from "@/components/icons/icons";
import { AdvancedOptionsToggle } from "@/components/AdvancedOptionsToggle";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HeaderTitle } from "@/components/header/HeaderTitle";
import EmbeddingWrapper from "./EmbeddingWrapper";
import { useFormContext } from "@/components/context/FormContext";
import { useRouter } from "next/navigation";
import { SIDEBAR_WIDTH } from "@/lib/constants";
import Sidebar from "../../connectors/[connector]/Sidebar";
import Link from "next/link";

function Main() {
  const [openToggle, setOpenToggle] = useState(true);

  // Cloud Provider based modals
  const [showTentativeProvider, setShowTentativeProvider] =
    useState<CloudEmbeddingProvider | null>(null);
  const [showUnconfiguredProvider, setShowUnconfiguredProvider] =
    useState<CloudEmbeddingProvider | null>(null);
  const [changeCredentialsProvider, setChangeCredentialsProvider] =
    useState<CloudEmbeddingProvider | null>(null);

  // Cloud Model based modals
  const [alreadySelectedModel, setAlreadySelectedModel] =
    useState<CloudEmbeddingModel | null>(null);
  const [showTentativeModel, setShowTentativeModel] =
    useState<CloudEmbeddingModel | null>(null);

  const [showModelInQueue, setShowModelInQueue] =
    useState<CloudEmbeddingModel | null>(null);

  const [selecting, setSelecting] = useState(false);

  // Open Model based modals
  const [showTentativeOpenProvider, setShowTentativeOpenProvider] =
    useState<HostedEmbeddingModel | null>(null);

  // Enabled / unenabled providers
  const [newEnabledProviders, setNewEnabledProviders] = useState<string[]>([]);
  const [newUnenabledProviders, setNewUnenabledProviders] = useState<string[]>(
    []
  );
  const [useLargeChunks, setUseLargeChunks] = useState(false);

  const [rerankingOption, setRerankingOption] = useState("cohere");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [llmChunkFilter, setLlmChunkFilter] = useState(false);
  const [queryExpansion, setQueryExpansion] = useState(false);
  const [showDeleteCredentialsModal, setShowDeleteCredentialsModal] =
    useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [showAddConnectorPopup, setShowAddConnectorPopup] =
    useState<boolean>(false);

  const {
    data: currentEmeddingModel,
    isLoading: isLoadingCurrentModel,
    error: currentEmeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    "/api/search-settings/get-current-embedding-model",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const { data: embeddingProviderDetails } = useSWR<EmbeddingDetails[]>(
    EMBEDDING_PROVIDERS_ADMIN_URL,
    errorHandlingFetcher
  );

  const {
    data: futureEmbeddingModel,
    isLoading: isLoadingFutureModel,
    error: futureEmeddingModelError,
  } = useSWR<CloudEmbeddingModel | HostedEmbeddingModel | null>(
    "/api/search-settings/get-secondary-embedding-model",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  const router = useRouter();
  const {
    data: ongoingReIndexingStatus,
    isLoading: isLoadingOngoingReIndexingStatus,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status?secondary_index=true",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  const { data: connectors } = useSWR<Connector<any>[]>(
    "/api/manage/connector",
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  const [useMiniChunks, setUseMiniChunks] = useState(true);
  // const [useLargeChunks, setUseLargeChunks] = useState(false);

  const onConfirm = async (
    model: CloudEmbeddingModel | HostedEmbeddingModel
  ) => {
    let newModel: EmbeddingModelDescriptor;

    if ("cloud_provider_name" in model) {
      // This is a CloudEmbeddingModel
      newModel = {
        ...model,
        model_name: model.model_name,
        cloud_provider_name: model.cloud_provider_name,
        // cloud_provider_id: model.cloud_provider_id || 0,
      };
    } else {
      // This is an EmbeddingModelDescriptor
      newModel = {
        ...model,
        model_name: model.model_name!,
        description: "",
        cloud_provider_name: null,
      };
    }

    const response = await fetch(
      "/api/search-settings/set-new-embedding-model",
      {
        method: "POST",
        body: JSON.stringify(newModel),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      setShowTentativeOpenProvider(null);
      setShowTentativeModel(null);
      mutate("/api/search-settings/get-secondary-embedding-model");
      if (!connectors || !connectors.length) {
        setShowAddConnectorPopup(true);
      }
    } else {
      alert(`Failed to update embedding model - ${await response.text()}`);
    }
  };

  const onCancel = async () => {
    const response = await fetch("/api/search-settings/cancel-new-embedding", {
      method: "POST",
    });
    if (response.ok) {
      setShowTentativeModel(null);
      mutate("/api/search-settings/get-secondary-embedding-model");
    } else {
      alert(
        `Failed to cancel embedding model update - ${await response.text()}`
      );
    }
    setIsCancelling(false);
  };

  if (isLoadingCurrentModel || isLoadingFutureModel) {
    return <ThreeDotsLoader />;
  }

  if (
    currentEmeddingModelError ||
    !currentEmeddingModel ||
    futureEmeddingModelError
  ) {
    return <ErrorCallout errorTitle="Failed to fetch embedding model status" />;
  }

  const onConfirmSelection = async (model: EmbeddingModelDescriptor) => {
    const response = await fetch(
      "/api/search-settings/set-new-embedding-model",
      {
        method: "POST",
        body: JSON.stringify(model),
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    if (response.ok) {
      setShowTentativeModel(null);
      mutate("/api/search-settings/get-secondary-embedding-model");
      if (!connectors || !connectors.length) {
        setShowAddConnectorPopup(true);
      }
    } else {
      alert(`Failed to update embedding model - ${await response.text()}`);
    }
  };

  const currentModelName = currentEmeddingModel?.model_name;
  const AVAILABLE_CLOUD_PROVIDERS_FLATTENED = AVAILABLE_CLOUD_PROVIDERS.flatMap(
    (provider) =>
      provider.embedding_models.map((model) => ({
        ...model,
        cloud_provider_id: provider.id,
        model_name: model.model_name, // Ensure model_name is set for consistency
      }))
  );

  const currentModel: CloudEmbeddingModel | HostedEmbeddingModel =
    AVAILABLE_MODELS.find((model) => model.model_name === currentModelName) ||
    AVAILABLE_CLOUD_PROVIDERS_FLATTENED.find(
      (model) => model.model_name === currentEmeddingModel.model_name
    )!;
  // ||
  // fillOutEmeddingModelDescriptor(currentEmeddingModel);

  const onSelectOpenSource = async (model: HostedEmbeddingModel) => {
    if (currentEmeddingModel?.model_name === INVALID_OLD_MODEL) {
      await onConfirmSelection(model);
    } else {
      setShowTentativeOpenProvider(model);
    }
  };

  const selectedModel = AVAILABLE_CLOUD_PROVIDERS[0];
  const clientsideAddProvider = (provider: CloudEmbeddingProvider) => {
    const providerName = provider.name;
    setNewEnabledProviders((newEnabledProviders) => [
      ...newEnabledProviders,
      providerName,
    ]);
    setNewUnenabledProviders((newUnenabledProviders) =>
      newUnenabledProviders.filter(
        (givenProvidername) => givenProvidername != providerName
      )
    );
  };

  const clientsideRemoveProvider = (provider: CloudEmbeddingProvider) => {
    const providerName = provider.name;
    setNewEnabledProviders((newEnabledProviders) =>
      newEnabledProviders.filter(
        (givenProvidername) => givenProvidername != providerName
      )
    );
    setNewUnenabledProviders((newUnenabledProviders) => [
      ...newUnenabledProviders,
      providerName,
    ]);
  };

  return (
    <div className="h-screen">
      <Title className="mb-2 mt-8 !text-3xl">Embedding models</Title>

      <Text>
        These deep learning models are used to generate vector representations
        of your documents, which then power Danswer&apos;s search.
      </Text>

      {currentModel ? (
        <>
          <Title className="mt-8 mb-2">Current Embedding Model</Title>
          <ModelPreview model={currentModel} />
        </>
      ) : (
        <Title className="mt-8 mb-4">Choose your Embedding Model</Title>
      )}

      <Link href="/admin/embeddings">
        <Button className="mt-8">Select or update model</Button>
      </Link>
    </div>
  );
}

function Page() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        title="Search Settings"
        icon={<EmbeddingIcon size={32} className="my-auto" />}
      />

      <Main />
    </div>
  );
}

export default Page;
