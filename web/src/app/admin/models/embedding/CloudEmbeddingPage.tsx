"use client";

import { ThreeDotsLoader } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { Button, Card, Text, Title } from "@tremor/react";
import { FiPackage } from "react-icons/fi";
import useSWR, { mutate } from "swr";
import { ModelOption, ModelSelector } from "./components/ModelSelector";
import { useState } from "react";
import { ModelSelectionConfirmationModal, ProviderCreationModal } from "./components/ModelSelectionConfirmation";
import { ReindexingProgressTable } from "./components/ReindexingProgressTable";
import { Modal } from "@/components/Modal";
import {
    CloudEmbeddingProvider,
    CloudEmbeddingModel,
    AVAILABLE_CLOUD_MODELS,
    AVAILABLE_MODELS,
    INVALID_OLD_MODEL,
    checkModelNameIsValid,
    fillOutEmeddingModelDescriptor,
    EmbeddingModelDescriptor
} from "./components/embeddingModels";
import { ErrorCallout } from "@/components/ErrorCallout";
import { Connector, ConnectorIndexingStatus } from "@/lib/types";
import Link from "next/link";
import { CustomModelForm } from "./components/CustomModelForm";
import { FaLock } from "react-icons/fa";
import { ChangeCredentialsModal, ChangeModelModal, DeleteCredentialsModal, ModelNotConfiguredModal, SelectModelModal } from "./components/Providers";
import OpenSourceEmbeddingSelectionPage from "./OpenSourceEmbeddingSelectionPage";


export default function CloudEmbeddingPage({ setTentativeNewEmbeddingModel, setTenativelyNewProvider, selectedModel, setShowModelNotConfiguredModal, setChangeCredentials }: {
    setTentativeNewEmbeddingModel: React.Dispatch<React.SetStateAction<CloudEmbeddingModel | null>>,
    setTenativelyNewProvider: React.Dispatch<React.SetStateAction<CloudEmbeddingProvider | null>>,
    selectedModel: CloudEmbeddingProvider,
    setShowModelNotConfiguredModal: React.Dispatch<React.SetStateAction<CloudEmbeddingProvider | null>>,
    setChangeCredentials: React.Dispatch<React.SetStateAction<CloudEmbeddingProvider | null>>
}) {
    return (<div>
        <Title className="mt-8">Configure Credentials</Title>
        <div className="gap-4 mt-2 pb-10 flex content-start flex-wrap">
            {AVAILABLE_CLOUD_MODELS.map((provider, ind) => (
                <div
                    key={ind}
                    className="p-4 border border-border rounded-lg shadow-md bg-hover-light w-96 flex flex-col"
                >
                    <div className="font-bold text-neutral-900 text-lg items-center py-1 gap-x-2 flex">
                        {provider.icon({ size: 40 })}
                        <p className="my-auto">
                            {provider.name}
                        </p>
                        <button onClick={() => setTenativelyNewProvider(provider)} className="cursor-pointer ml-auto">
                            {!provider.configured && <FaLock />}
                        </button>
                    </div>
                    <div>{provider.description}</div>

                    <div className="mt-4">
                        {provider.models.map((model, index) => (
                            <div
                                key={index}
                                className={`p-3 mb-2 border-2 border-neutral-300 border-opacity-40 rounded-md rounded cursor-pointer ${provider.configured
                                    ? selectedModel?.name === model.name
                                        ? 'bg-teal-50 border border-blue-300'
                                        : 'hover:bg-blue-50'
                                    : 'hover:bg-rose-50'
                                    }`}
                                onClick={() => {
                                    if (model.name === "") {
                                        return;
                                    } else if (provider.configured) {
                                        setTentativeNewEmbeddingModel(model);
                                    } else {
                                        setShowModelNotConfiguredModal(provider);
                                    }
                                }}
                            >
                                <div className="flex justify-between">
                                    <div className="font-medium">{model.name}</div>
                                    <p className="text-sm flex-none">
                                        {provider.configured ? model.is_configured ? "Selected" : "Unselected" : "Unconfigured"}
                                    </p>
                                </div>
                                <div className="text-sm text-gray-600">{model.description}</div>
                            </div>
                        ))}
                    </div>

                    <div className="text-sm flex justify-between mt-1 mx-2">
                        <button
                            onClick={() => {
                                if (provider.configured) {
                                    setChangeCredentials(provider);
                                } else {
                                    setShowModelNotConfiguredModal(provider);
                                }
                            }}
                            className="hover:underline cursor-pointer"
                        >
                            {provider.configured ? "Swap credentials" : 'Configure credentials'}
                        </button>
                        <a className="hover:underline cursor-pointer">
                            Learn more
                        </a>
                    </div>
                </div>
            ))}
        </div>
    </div>
    )
}