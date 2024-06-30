"use client";

import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";

import { ConnectorIndexingStatus, GitConfig } from "@/lib/types";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { AdminPageTitle } from "@/components/admin/Title";
import { GitIcon } from "@/components/icons/icons";
import { Card, Title } from "@tremor/react";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { LoadingAnimation } from "@/components/Loading";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { errorHandlingFetcher } from "@/lib/fetcher";

export default function Git() {
  const { mutate } = useSWRConfig();

  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher
  );

  console.log(connectorIndexingStatuses);
  console.log(isConnectorIndexingStatusesLoading);
  console.log(isConnectorIndexingStatusesError);

  const gitIndexingStatuses: ConnectorIndexingStatus<GitConfig, {}>[] =
    connectorIndexingStatuses?.filter((connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "git"
    ) ?? [];

  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <AdminPageTitle icon={<GitIcon size={32} />} title="Git" />

      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Specify the repository to index
      </Title>
      <p className="text-sm mb-2">
        Specify the URL of a Git repository to index, the branch containing the files, a key to authenticate with the server and a comma-delimited list of glob patterns to include in the index.
      </p>
      <Card>
        <ConnectorForm<GitConfig>
          nameBuilder={(values) => `GitConnector-${values.remote_url}`}
          ccPairNameBuilder={(values) => values.remote_url}
          shouldCreateEmptyCredentialForConnector={true}
          source="git"
          inputType="load_state"
          formBody={
            <>
              <TextFormField name="remote_url" label="Remote URL" autoCompleteDisabled={false} />
              <TextFormField name="branch" label="Checkout branch" />
              <TextFormField name="auth_private_key" isTextArea={true} label="Authenticate with SSH private key" />
              <TextFormField name="include_globs" label="Ingest files matching globs" />
            </>
          }
          validationSchema={Yup.object().shape({
            remote_url: Yup.string().required("Please enter a Git remote URL to clone"),
            branch: Yup.string().required("Please specify a branch to checkout"),
            auth_private_key: Yup.string().optional(),
            include_globs: Yup.string().required("Please specify a comma-delimited list of glob patterns specifying which files to include in indexing"),
          })}
          initialValues={{
            remote_url: "",
            branch: "main",
            auth_private_key: "",
            include_globs: "**/*.md",
          }}
          refreshFreq={60 * 60 * 24} // 1 day
        />
      </Card>

      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Already indexed Git repositories
      </Title>
      {isConnectorIndexingStatusesLoading ? (
        <LoadingAnimation text="Loading" />
      ) : isConnectorIndexingStatusesError ? (
        <div>Error loading indexing history</div>
      ) : gitIndexingStatuses.length > 0 ? (
        <ConnectorsTable<GitConfig, {}>
          connectorIndexingStatuses={gitIndexingStatuses}
          specialColumns={[
            {
              header: "Remote URL",
              key: "remote_url",
              getValue: (
                ccPairStatus: ConnectorIndexingStatus<GitConfig, any>
              ) => {
                const connectorConfig = ccPairStatus.connector.connector_specific_config;
                return (
                  <code>{connectorConfig.remote_url}</code>
                );
              },
            },
            {
              header: "Branch",
              key: "branch",
              getValue: (
                ccPairStatus: ConnectorIndexingStatus<GitConfig, any>
              ) => {
                const connectorConfig = ccPairStatus.connector.connector_specific_config;
                return (
                  <code>{connectorConfig.branch}</code>
                );
              },
            },
          ]}
          onUpdate={() => mutate("/api/manage/admin/connector/indexing-status")}
        />
      ) : (
        <p className="text-sm">No indexed Git repositories found</p>
      )}
    </div>
  )
}
