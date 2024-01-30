"use client";

import * as Yup from "yup";
import { XenforoIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
    XenforoCredentialJson,
    XenforoConfig,
    ConnectorIndexingStatus,
    Credential,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { usePublicCredentials } from "@/lib/hooks";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, Text, Title } from "@tremor/react";

const Main = () => {
    const { popup, setPopup } = usePopup();

    const { mutate } = useSWRConfig();
    const {
        data: connectorIndexingStatuses,
        isLoading: isConnectorIndexingStatusesLoading,
        error: isConnectorIndexingStatusesError,
    } = useSWR<ConnectorIndexingStatus<any, any>[]>(
        "/api/manage/admin/connector/indexing-status",
        fetcher
    );
    const {
        data: credentialsData,
        isLoading: isCredentialsLoading,
        error: isCredentialsError,
        refreshCredentials,
    } = usePublicCredentials();

    if (
        (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
        (!credentialsData && isCredentialsLoading)
    ) {
        return <LoadingAnimation text="Loading" />;
    }

    if (isConnectorIndexingStatusesError || !connectorIndexingStatuses) {
        return <div>Failed to load connectors</div>;
    }

    if (isCredentialsError || !credentialsData) {
        return <div>Failed to load credentials</div>;
    }

    const xenforoConnectorIndexingStatuses: ConnectorIndexingStatus<
        XenforoConfig,
        XenforoCredentialJson
    >[] = connectorIndexingStatuses.filter(
        (connectorIndexingStatus) =>
            connectorIndexingStatus.connector.source === "xenforo"
    );
    const xenforoCredential: Credential<XenforoCredentialJson> | undefined =
        credentialsData.find(
            (credential) => credential.credential_json?.username
        );

    return (
        <>
            {popup}
            <Title className="mb-2 mt-6 ml-auto mr-auto">
                Step 1: Provide your API details
            </Title>

            {xenforoCredential ? (
                <>
                    <div className="flex mb-1 text-sm">
                        <Text className="my-auto">Existing username: </Text>
                        <Text className="ml-1 italic my-auto max-w-md">
                            {xenforoCredential.credential_json?.username}
                        </Text>
                        <button
                            className="ml-1 hover:bg-hover rounded p-1"
                            onClick={async () => {
                                if (xenforoConnectorIndexingStatuses.length > 0) {
                                    setPopup({
                                        type: "error",
                                        message:
                                            "Must delete all connectors before deleting credentials",
                                    });
                                    return;
                                }
                                await adminDeleteCredential(xenforoCredential.id);
                                refreshCredentials();
                            }}
                        >
                            <TrashIcon />
                        </button>
                    </div>
                </>
            ) : (
                <>
                    <Text>
                        To get started you&apos;ll need credential details for your Xenforo
                        instance.
                    </Text>
                    <Card className="mt-2 mb-4">
                        <CredentialForm<XenforoCredentialJson>
                            formBody={
                                <>
                                    <TextFormField
                                        name="username"
                                        label="Username:"
                                    />
                                    <TextFormField
                                        name="password"
                                        label="Password:"
                                        type="password"
                                    />
                                </>
                            }
                            validationSchema={Yup.object().shape({
                                username: Yup.string().required(
                                    "Please enter your Xenforo API token ID"
                                ),
                                password: Yup.string().required(
                                    "Please enter your Xenforo API token secret"
                                ),
                            })}
                            initialValues={{
                                username: "",
                                password: "",
                            }}
                            onSubmit={(isSuccess) => {
                                if (isSuccess) {
                                    refreshCredentials();
                                    mutate("/api/manage/admin/connector/indexing-status");
                                }
                            }}
                        />
                    </Card>
                </>
            )}

            {xenforoConnectorIndexingStatuses.length > 0 && (
                <>
                    <Title className="mb-2 mt-6 ml-auto mr-auto">
                        Xenforo indexing status
                    </Title>
                    <Text className="mb-2">
                        The latest page, chapter, book and shelf changes are fetched every
                        10 minutes.
                    </Text>
                    <div className="mb-2">
                        <ConnectorsTable<XenforoConfig, XenforoCredentialJson>
                            connectorIndexingStatuses={xenforoConnectorIndexingStatuses}
                            liveCredential={xenforoCredential}
                            getCredential={(credential) => {
                                return (
                                    <div>
                                        <p>{credential.credential_json.username}</p>
                                    </div>
                                );
                            }}
                            onCredentialLink={async (connectorId) => {
                                if (xenforoCredential) {
                                    await linkCredential(connectorId, xenforoCredential.id);
                                    mutate("/api/manage/admin/connector/indexing-status");
                                }
                            }}
                            onUpdate={() =>
                                mutate("/api/manage/admin/connector/indexing-status")
                            }
                        />
                    </div>
                </>
            )}

            {xenforoCredential &&
                xenforoConnectorIndexingStatuses.length === 0 && (
                    <>
                        <Card className="mt-4">
                            <h2 className="font-bold mb-3">Create Connection</h2>
                            <Text className="mb-4">
                                Press connect below to start the connection to your Xenforo
                                instance.
                            </Text>
                            <ConnectorForm<XenforoConfig>
                                nameBuilder={(values) => `XenforoConnector`}
                                ccPairNameBuilder={(values) => `XenforoConnector`}
                                source="xenforo"
                                inputType="poll"
                                formBody={
                                    <>
                                        <TextFormField name="forumUrl" label="Forum URL" />
                                    </>
                                }
                                validationSchema={
                                    Yup.object().shape({
                                        forumUrl: Yup.string().url('Invalid URL').required('URL is required'),
                                        // Other XenforoConfig properties, if any, should be included here
                                    })
                                }
                                initialValues={{
                                    forumUrl: "",
                                }}
                                refreshFreq={10 * 60} // 10 minutes
                                credentialId={xenforoCredential.id}
                            />
                        </Card>
                    </>
                )}

            {!xenforoCredential && (
                <>
                    <Text className="mb-4">
                        Please provide your forum details in Step 1 first! Once done with
                        that, you&apos;ll be able to start the connection then see indexing
                        status.
                    </Text>
                </>
            )}
        </>
    );
};

export default function Page() {
    return (
        <div className="mx-auto container">
            <div className="mb-4">
                <HealthCheckBanner />
            </div>

            <AdminPageTitle icon={<XenforoIcon size={32} />} title="Xenforo" />

            <Main />
        </div>
    );
}
