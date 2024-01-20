"use client";

import * as Yup from "yup";
import { TrashIcon, ExchangeIcon } from "@/components/icons/icons"; // Make sure you have a Document360 icon
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  ExchangeConfig,
  ExchangeCredentialJson,
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
    
      const exchangeConnectorIndexingStatuses: ConnectorIndexingStatus<
        ExchangeConfig,
        ExchangeCredentialJson
      >[] = connectorIndexingStatuses.filter(
        (connectorIndexingStatus) =>
          connectorIndexingStatus.connector.source === "exchange"
      );

      const exchangeCredential:
    | Credential<ExchangeCredentialJson>
    | undefined = credentialsData.find(
    (credential) => credential.credential_json?.aad_client_id
  );

  return (
    <>
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide Exchange credentials
      </Title>
      {exchangeCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <Text className="my-auto">Existing Azure AD Client ID: </Text>
            <Text className="ml-1 italic my-auto">
              {exchangeCredential.credential_json.aad_client_id}
            </Text>
            <button
              className="ml-1 hover:bg-hover rounded p-1"
              onClick={async () => {
                await adminDeleteCredential(exchangeCredential.id);
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
            To index Exchange Emails, please provide
            Azure AD client ID, Client Secret, and Tenant ID.
          </Text>
          <Card className="mt-2">
            <CredentialForm<ExchangeCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="aad_client_id"
                    label="Azure AD Client ID:"
                  />
                  <TextFormField
                    name="aad_tenant_id"
                    label="Azure AD Tenant ID:"
                  />
                  <TextFormField
                    name="aad_user_id"
                    label="Azure AD User ID:"
                  />
                  <TextFormField
                    name="aad_client_secret"
                    label="Azure AD Client Secret:"
                    type="password"
                    />
                  </>
                }
                validationSchema={Yup.object().shape({
                  aad_client_id: Yup.string().required(
                    "Please enter your Azure AD Client ID"
                  ),
                  
                  aad_tenant_id: Yup.string()
                    .required(
                      "Please enter your Azure AD Tenant ID"
                    ),
                    aad_user_id: Yup.string()
                    .required(
                      "Please enter your Azure AD User ID"
                    ),
                    aad_client_secret: Yup.string().required(
                      "Please enter your Azure AD Client Secret"
                    ),
                })}
                initialValues={{
                  aad_client_id: "",
                  aad_user_id: "",
                  aad_tenant_id: "",
                  aad_client_secret: "",
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
        Step 2: Manage Exchange Connector
      </Title>

      {exchangeConnectorIndexingStatuses.length > 0 && (
        <>
          <Text className="mb-2">
            We index the most recently updated emails from each Exchange with matching categories
            instance listed below regularly.
          </Text>
          <Text className="mb-2">
            The initial poll at this time retrieves emails updated in the past
            hour. All subsequent polls execute every ten minutes. This should be
            configurable in the future.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<ExchangeConfig, ExchangeCredentialJson>
              connectorIndexingStatuses={
                exchangeConnectorIndexingStatuses
              }
              liveCredential={exchangeCredential}
              getCredential={(credential) =>
                credential.credential_json.aad_tenant_id
              }
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
              onCredentialLink={async (connectorId) => {
                if (exchangeCredential) {
                  await linkCredential(
                    connectorId,
                    exchangeCredential.id
                  );
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
            />
          </div>
        </>
      )}

      {exchangeCredential &&
      exchangeConnectorIndexingStatuses.length === 0 ? (
        <Card className="mt-4">
          <ConnectorForm<ExchangeConfig>
            nameBuilder={(values) =>
              `Exchange-${exchangeCredential.credential_json.aad_tenant_id}`
            }
            ccPairNameBuilder={(values) =>
              `Exchange ${exchangeCredential.credential_json.aad_tenant_id}`
            }
            source="exchange"
            inputType="poll"
            formBodyBuilder={TextArrayFieldBuilder({
              name: "categories",
              label: "Categories:",
              subtext:
                "Specify 0 or more categories to index. For example, specifying the category " +
                "'Index' for the 'danswerai' exchange will cause us to only index all emails " +
                "categorised with the Index category " +
                "If no categories are specified, all emails in your mailbox will be indexed.",
            })}
            validationSchema={Yup.object().shape({
              categories: Yup.array()
                .of(Yup.string().required("Categories must be strings"))
                .required(),
            })}
            formBody={<></>}
            initialValues={{
              categories: []
            }}
            credentialId={exchangeCredential.id}
            refreshFreq={10 * 60} // 10 minutes
          />
        </Card>
      ) : (
        <Text>
          Please provide all Azure info in Step 1 first! Once you're done with
          that, you can then specify which Exchange categories you want to make
          searchable.
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
  
        <AdminPageTitle
          icon={<ExchangeIcon size={32} />}
          title="Exchange"
        />
  
        <MainSection />
      </div>
    );
  }