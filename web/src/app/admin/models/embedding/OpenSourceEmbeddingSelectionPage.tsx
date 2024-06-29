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




export default function OpenSourceEmbeddingSelectionPage(
    { onSelectOpenSource, currentModelName }: {
        onSelectOpenSource: (model: EmbeddingModelDescriptor) => Promise<void>
        , currentModelName: string,
    }) {
    return (

        <div>
            <ModelSelector
                modelOptions={AVAILABLE_MODELS.filter(
                    (modelOption) => modelOption.model_name !== currentModelName
                )}
                setSelectedModel={onSelectOpenSource}
            />


            <Title className="mt-8">Alternatively, here are some cloud-based models to choose from!</Title>
            <Text className="mb-4">
                They require API keys and run in the cloud of the respective providers.
            </Text>

            <Text className="mt-6">
                Alternatively, (if you know what you&apos;re doing) you can
                specify a{" "}
                <a
                    target="_blank"
                    href="https://www.sbert.net/"
                    className="text-link"
                >
                    SentenceTransformers
                </a>
                -compatible model of your choice below. The rough list of
                supported models can be found{" "}
                <a
                    target="_blank"
                    href="https://huggingface.co/models?library=sentence-transformers&sort=trending"
                    className="text-link"
                >
                    here
                </a>
                .
                <br />
                <b>NOTE:</b> not all models listed will work with Danswer, since
                some have unique interfaces or special requirements. If in doubt,
                reach out to the Danswer team.
            </Text>

            <div className="w-full flex">
                <Card className="mt-4 2xl:w-4/6 mx-auto">
                    <CustomModelForm onSubmit={onSelectOpenSource} />
                </Card>
            </div>
        </div>

    )
}