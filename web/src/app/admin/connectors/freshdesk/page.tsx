'use client'

import * as React from "react";
import * as Yup from "yup";
import {
  TrashIcon,
  FreshdeskIcon,
} from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  FreshdeskConfig,
  FreshdeskCredentialJson,
  ConnectorIndexingStatus,
  Credential,
} from "@/lib/types";
import {
  adminDeleteCredential,
  linkCredential,
} from "@/lib/credential";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  TextFormField,
  TextArrayFieldBuilder,
} from "@/components/admin/connectors/Field";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { usePublicCredentials } from "@/lib/hooks";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, Text, Title } from "@tremor/react";

interface JSXIntrinsicElements {
  div: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >;
  button: React.DetailedHTMLProps<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    HTMLButtonElement
  >;
  input: React.DetailedHTMLProps<
    React.InputHTMLAttributes<HTMLInputElement>,
    HTMLInputElement
  >;
  textarea: React.DetailedHTMLProps<
    React.TextareaHTMLAttributes<HTMLTextAreaElement>,
    HTMLTextAreaElement
  >;
  title: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLTitleElement>,
    HTMLTitleElement
  >;
  card: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLDivElement>,
    HTMLDivElement
  >;
  text: React.DetailedHTMLProps<
    React.HTMLAttributes<HTMLParagraphElement>,
    HTMLParagraphElement
  >;
}

declare global {
  namespace JSX {
    interface IntrinsicElements extends JSXIntrinsicElements {}
  }
}

const MainSection = () => {
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

  const freshdeskConnectorIndexingStatuses: ConnectorIndexingStatus<
    FreshdeskConfig,
    FreshdeskCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "freshdesk"
  );

  const freshdeskCredential:
    | Credential<FreshdeskCredentialJson>
    | undefined = credentialsData.find(
    (credential) => credential.credential_json?.freshdesk_api_key
  );

  return (
    <>
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide Freshdesk credentials
      </Title>
      {freshdeskCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <Text className="my-auto">Existing Freshdesk API key: </Text>
            <Text className="ml-1 italic my-auto">
              {freshdeskCredential.credential_json.freshdesk_api_key}
            </Text>
            <button
              className="ml-1 hover:bg-hover rounded p-1"
              onClick={async () => {
                await adminDeleteCredential(freshdeskCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <Text className="mb-2">
            To use the Freshdesk connector, provide a Freshdesk API key.
          </Text>
          <Card className="mt-4">
            <CredentialForm<FreshdeskCredentialJson>
              formBody={
                <>
                <TextFormField
                  name="freshdesk_domain"
                  label="Freshdesk domain:"
                />
                <TextFormField
                  name="freshdesk_api_key"
                  label="Freshdesk API key:"
                />
                <TextFormField
                  name="freshdesk_password"
                  label="Freshdesk password:"
                />
                </>
              }
              validationSchema={Yup.object().shape({
                freshdesk_domain: Yup.string().required(
                  "Please enter your Freshdesk domain e.g. freshdesk.atlassian.net"
                ),
                freshdesk_api_key: Yup.string().required(
                  "Please enter your Freshdesk API key"
                ),
                freshdesk_password: Yup.string().required(
                  "Please enter your Freshdesk password"
                ),
              })}
              initialValues={{
                freshdesk_api_key: "",
                freshdesk_domain: "",
                freshdesk_password: "",
              }}
              onSubmit={(isSuccess) => {
                if (isSuccess) {
                  refreshCredentials();
                }
              }}
            />
          </Card>
        </>
      )}

      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 2: Manage Freshdesk Connector
      </Title>

          {freshdeskConnectorIndexingStatuses.length > 0 && (
            <>
              <Text className="mb-2">
                We index the most recently updated tickets from each Freshdesk
                instance listed below regularly.
              </Text>
              <Text className="mb-2">
                The initial poll at this time retrieves tickets updated in the past
                hour. All subsequent polls execute every ten minutes. This should be
                configurable in the future.
              </Text>
              <div className="mb-2">
                <ConnectorsTable<FreshdeskConfig, FreshdeskCredentialJson>
                  connectorIndexingStatuses={
                    freshdeskConnectorIndexingStatuses
                  }
                  liveCredential={freshdeskCredential}
                  getCredential={(credential) =>
                    credential.credential_json.freshdesk_api_key
                  }
                  onUpdate={() =>
                    mutate("/api/manage/admin/connector/indexing-status")
                  }
                  onCredentialLink={async (connectorId) => {
                    if (freshdeskCredential) {
                      await linkCredential(
                        connectorId,
                        freshdeskCredential.id
                      );
                      mutate("/api/manage/admin/connector/indexing-status");
                    }
                  }}
                />
              </div>
            </>
          )}

          {freshdeskCredential && freshdeskConnectorIndexingStatuses.length === 0 ? (
            <Card className="mt-4">
              <ConnectorForm<FreshdeskConfig>
                nameBuilder={(values) => `Freshdesk-${values.domain}`}
                ccPairNameBuilder={(values) => values.domain}  // Update this line
                source="freshdesk"
                inputType="poll"
                credentialId={freshdeskCredential.id}
                formBody={
                  <>
                    <TextFormField name="domain" label="Freshdesk domain:" />
                    <TextFormField name="api_key" label="Freshdesk API key:" />
                    <TextFormField name="password" label="Freshdesk password:" />
                  </>
                }
                validationSchema={Yup.object().shape({
                  domain: Yup.string().required("Please enter your Freshdesk domain"),
                  api_key: Yup.string().required("Please enter your Freshdesk API key"),
                  password: Yup.string().required("Please enter your Freshdesk password"),
                })}
                initialValues={{ domain: "", api_key: "", password: "" }}
                refreshFreq={10 * 60} // 10 minutes
              />
            </Card>
      ) : (
        <Text>
          Please provide your Freshdesk credentials in Step 1 first!
        </Text>
      )}
    </>
  );
};

export default function Page() {
  return (
    <Card className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <AdminPageTitle
        icon={<FreshdeskIcon size={32} />}
        title="Freshdesk"
      />
      <MainSection />
    </Card>
  );
}