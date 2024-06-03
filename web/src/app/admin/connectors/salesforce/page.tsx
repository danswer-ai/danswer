"use client";

import * as Yup from "yup";
import { TrashIcon, SalesforceIcon } from "@/components/icons/icons"; // Make sure you have a Document360 icon
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  SalesforceConfig,
  SalesforceCredentialJson,
  ConnectorIndexingStatus,
  Credential,
} from "@/lib/types"; // Modify or create these types as required
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
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

  const SalesforceConnectorIndexingStatuses: ConnectorIndexingStatus<
    SalesforceConfig,
    SalesforceCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "Salesforce"
  );

  const SalesforceCredential: Credential<SalesforceCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.aad_client_id
    );

  return (
    <>
      <Text>
        The Salesforce connector allows you to index and search through your
        Salesforce files. Once setup, your Word documents, Excel files,
        PowerPoint presentations, OneNote notebooks, PDFs, and uploaded files
        will be queryable within Danswer.
      </Text>

      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide Salesforce credentials
      </Title>
      {SalesforceCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <Text className="my-auto">Existing Azure AD Client ID: </Text>
            <Text className="ml-1 italic my-auto">
              {SalesforceCredential.credential_json.aad_client_id}
            </Text>
            <button
              className="ml-1 hover:bg-hover rounded p-1"
              onClick={async () => {
                await adminDeleteCredential(SalesforceCredential.id);
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
            As a first step, please provide Application (client) ID, Directory
            (tenant) ID, and Client Secret. You can follow the guide{" "}
            <a
              target="_blank"
              href="https://docs.danswer.dev/connectors/Salesforce"
              className="text-link"
            >
              here
            </a>{" "}
            to create an Azure AD application and obtain these values.
          </Text>
          <Card className="mt-2">
            <CredentialForm<SalesforceCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="sf_username"
                    label="Salesforce Username:"
                  />
                  <TextFormField
                    name="sf_password"
                    label="Salesforce Password:"
                    type="password"
                  />
                  <TextFormField
                    name="sf_security_token"
                    label="Salesforce Security Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                sf_username: Yup.string().required(
                  "Please enter your Salesforce username"
                ),
                sf_password: Yup.string().required(
                  "Please enter your Salesforce password"
                ),
                sf_security_token: Yup.string().required(
                  "Please enter your Salesforce security token"
                ),
              })}
              initialValues={{
                sf_username: "",
                sf_password: "",
                sf_security_token: "",
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
        Step 2: Manage Salesforce Connector
      </Title>

      {SalesforceConnectorIndexingStatuses.length > 0 && (
        <>
          <Text className="mb-2">
            The latest state of your Word documents, Excel files, PowerPoint
            presentations, OneNote notebooks, PDFs, and uploaded files are
            fetched every 10 minutes.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<SalesforceConfig, SalesforceCredentialJson>
              connectorIndexingStatuses={SalesforceConnectorIndexingStatuses}
              liveCredential={SalesforceCredential}
              getCredential={(credential) =>
                credential.credential_json.aad_directory_id
              }
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
              onCredentialLink={async (connectorId) => {
                if (SalesforceCredential) {
                  await linkCredential(connectorId, SalesforceCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              specialColumns={[
                {
                  header: "Connectors",
                  key: "connectors",
                  getValue: (ccPairStatus) => {
                    const connectorConfig =
                      ccPairStatus.connector.connector_specific_config;
                    return `${connectorConfig.sites}`;
                  },
                },
              ]}
              includeName
            />
          </div>
        </>
      )}

      {SalesforceCredential ? (
        <Card className="mt-4">
          <ConnectorForm<SalesforceConfig>
            nameBuilder={(values) =>
              values.sites && values.sites.length > 0
                ? `Salesforce-${values.sites.join("-")}`
                : "Salesforce"
            }
            ccPairNameBuilder={(values) =>
              values.sites && values.sites.length > 0
                ? `Salesforce-${values.sites.join("-")}`
                : "Salesforce"
            }
            source="Salesforce"
            inputType="poll"
            // formBody={<></>}
            formBodyBuilder={TextArrayFieldBuilder({
              name: "sites",
              label: "Sites:",
              subtext:
                "Specify 0 or more sites to index. For example, specifying the site " +
                "'support' for the 'danswerai' Salesforce will cause us to only index documents " +
                "within the 'https://danswerai.Salesforce.com/sites/support' site. " +
                "If no sites are specified, all sites in your organization will be indexed.",
            })}
            validationSchema={Yup.object().shape({
              sites: Yup.array()
                .of(Yup.string().required("Site names must be strings"))
                .required(),
            })}
            initialValues={{
              sites: [],
            }}
            credentialId={SalesforceCredential.id}
            refreshFreq={10 * 60} // 10 minutes
          />
        </Card>
      ) : (
        <Text>
          Please provide all Azure info in Step 1 first! Once you&apos;re done
          with that, you can then specify which Salesforce sites you want to
          make searchable.
        </Text>
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

      <AdminPageTitle icon={<SalesforceIcon size={32} />} title="Salesforce" />

      <MainSection />
    </div>
  );
}
