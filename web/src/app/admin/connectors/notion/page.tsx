"use client";

import * as Yup from "yup";
import { NotionIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  NotionCredentialJson,
  NotionConfig,
  Credential,
  ConnectorIndexingStatus,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import { LoadingAnimation } from "@/components/Loading";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePublicCredentials } from "@/lib/hooks";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";
import { Divider } from "@/components/Divider";
import { Button } from "@/components/ui/button";

const Main = () => {
  const { toast } = useToast();

  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: connectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: credentialsError,
    refreshCredentials,
  } = usePublicCredentials();

  if (
    (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
    (!credentialsData && isCredentialsLoading)
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (connectorIndexingStatusesError || !connectorIndexingStatuses) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={connectorIndexingStatusesError?.info?.detail}
      />
    );
  }

  if (credentialsError || !credentialsData) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={credentialsError?.info?.detail}
      />
    );
  }

  const notionConnectorIndexingStatuses: ConnectorIndexingStatus<
    NotionConfig,
    NotionCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "notion"
  );
  const notionCredential: Credential<NotionCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.notion_integration_token
    );

  return (
    <>
      <h3 className="mb-2 ml-auto mr-auto">
        Step 1: Provide your authorization details
      </h3>

      {notionCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Integration Token: </p>
            <p className="max-w-md my-auto ml-1 italic">
              {notionCredential.credential_json?.notion_integration_token}
            </p>
            <Button
              onClick={async () => {
                if (notionConnectorIndexingStatuses.length > 0) {
                  toast({
                    title: "Error",
                    description:
                      "Must delete all connectors before deleting credentials",
                    variant: "destructive",
                  });
                  return;
                }
                await adminDeleteCredential(notionCredential.id);
                refreshCredentials();
              }}
              variant="destructive"
            >
              <TrashIcon />
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            To get started you&apos;ll need to create an internal integration in
            Notion for enMedD AI. Follow the instructions in the&nbsp;
            <a
              href="https://developers.notion.com/docs/create-a-notion-integration"
              target="_blank"
            >
              Notion Developer Documentation
            </a>
            &nbsp; on the Notion website, to create a new integration. Once
            you&apos;ve created an integration, copy the integration secret
            token and paste it below. Follow the remaining instructions on the
            Notion docs to allow enMedD AI to read Notion Databases and Pages
            using the new integration.
          </p>
          <Card className="my-4">
            <CardContent>
              <CredentialForm<NotionCredentialJson>
                formBody={
                  <TextFormField
                    name="notion_integration_token"
                    label="Integration Token:"
                    type="password"
                  />
                }
                validationSchema={Yup.object().shape({
                  notion_integration_token: Yup.string().required(
                    "Please enter the Notion Integration token for the enMedD AI integration."
                  ),
                })}
                initialValues={{
                  notion_integration_token: "",
                }}
                onSubmit={(isSuccess) => {
                  if (isSuccess) {
                    refreshCredentials();
                    mutate("/api/manage/admin/connector/indexing-status");
                  }
                }}
              />
            </CardContent>
          </Card>
        </>
      )}

      <h3 className="mt-6 mb-2 ml-auto mr-auto">Step 2: Manage Connectors</h3>
      {notionConnectorIndexingStatuses.length > 0 && (
        <>
          <p className="mb-2">
            The latest page updates are fetched from Notion every 10 minutes.
          </p>
          <div className="mb-2">
            <ConnectorsTable<NotionConfig, NotionCredentialJson>
              connectorIndexingStatuses={notionConnectorIndexingStatuses}
              specialColumns={[
                {
                  header: "Root Page ID",
                  key: "root_page_id",
                  getValue: (ccPairStatus) =>
                    ccPairStatus.connector.connector_specific_config
                      .root_page_id || "-",
                },
              ]}
              liveCredential={notionCredential}
              getCredential={(credential) => {
                return (
                  <div>
                    <p>{credential.credential_json.notion_integration_token}</p>
                  </div>
                );
              }}
              onCredentialLink={async (connectorId) => {
                if (notionCredential) {
                  await linkCredential(connectorId, notionCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </div>
          <Divider />
        </>
      )}

      {notionCredential && (
        <>
          <Card className="mt-4">
            <CardContent>
              <h2 className="mb-1 font-bold">Create New Connection</h2>
              <p className="mb-4 text-sm">
                Press connect below to start the connection to Notion.
              </p>
              <ConnectorForm<NotionConfig>
                nameBuilder={(values) =>
                  values.root_page_id
                    ? `NotionConnector-${values.root_page_id}`
                    : "NotionConnector"
                }
                ccPairNameBuilder={(values) =>
                  values.root_page_id
                    ? `Notion-${values.root_page_id}`
                    : "Notion"
                }
                source="notion"
                inputType="poll"
                formBody={
                  <>
                    <TextFormField
                      name="root_page_id"
                      label="[Optional] Root Page ID"
                      subtext={
                        "If specified, will only index the specified page + all of its child pages. " +
                        "If left blank, will index all pages the integration has been given access to."
                      }
                      autoCompleteDisabled={true}
                    />
                  </>
                }
                validationSchema={Yup.object().shape({
                  root_page_id: Yup.string(),
                })}
                initialValues={{
                  root_page_id: "",
                }}
                refreshFreq={10 * 60} // 10 minutes
                credentialId={notionCredential.id}
              />
            </CardContent>
          </Card>
        </>
      )}

      {!notionCredential && (
        <>
          <p className="mb-4 text-sm">
            Please provide your integration details in Step 1 first! Once done
            with that, you&apos;ll be able to start the connection then see
            indexing status.
          </p>
        </>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="h-full w-full overflow-y-auto">
      <div className="container">
        <BackButton />

        <AdminPageTitle icon={<NotionIcon size={32} />} title="Notion" />

        <Main />
      </div>
    </div>
  );
}
