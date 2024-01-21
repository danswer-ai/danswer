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

  const exchangeCredential: Credential<ExchangeCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.aad_app_id
    );

  return (
    <>
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide Exchange credentials
      </Title>
      {exchangeCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <Text className="my-auto">Existing Azure AD App ID: </Text>
            <Text className="ml-1 italic my-auto">
              {exchangeCredential.credential_json.aad_app_id}
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
            To index an Exchange email mailbox, please provide the following
            Tenant ID, Azure AD App ID, App Secret, and Account Email. Currently
            this connector only supports one email account.
          </Text>
          <Card className="mt-2">
            <CredentialForm<ExchangeCredentialJson>
              formBody={
                <>
                  <TextFormField name="aad_app_id" label="Azure AD App ID:" />
                  <TextFormField
                    name="aad_tenant_id"
                    label="Azure AD Tenant ID:"
                  />
                  <TextFormField
                    name="aad_user_id"
                    label="Azure AD User Email:"
                  />
                  <TextFormField
                    name="aad_app_secret"
                    label="Azure AD App Secret:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                aad_app_id: Yup.string().required(
                  "Please enter your Azure AD App ID"
                ),

                aad_tenant_id: Yup.string().required(
                  "Please enter your Azure AD Tenant ID"
                ),
                aad_user_id: Yup.string().required(
                  "Please enter your Azure AD User Email"
                ),
                aad_app_secret: Yup.string().required(
                  "Please enter your Azure AD App Secret"
                ),
              })}
              initialValues={{
                aad_app_id: "",
                aad_user_id: "",
                aad_tenant_id: "",
                aad_app_secret: "",
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
            We index the most recently modified emails from the exchange online
            email account specified below. You can filter the emails pulled from
            exchange by setting 'optional' matching categories. Currently,
            attachments are not indexed.
          </Text>
          <Text className="mb-2">
            The initial poll at this time retrieves the latest 100 emails from
            exchange and re-indexes those updated in the past hour. All
            subsequent polls execute every ten minutes. This should be
            configurable in the future.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<ExchangeConfig, ExchangeCredentialJson>
              connectorIndexingStatuses={exchangeConnectorIndexingStatuses}
              liveCredential={exchangeCredential}
              getCredential={(credential) =>
                credential.credential_json.aad_tenant_id
              }
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
              onCredentialLink={async (connectorId) => {
                if (exchangeCredential) {
                  await linkCredential(connectorId, exchangeCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
            />
          </div>
        </>
      )}

      {exchangeCredential && exchangeConnectorIndexingStatuses.length === 0 ? (
        <>
        <Text className="mb-2">
        By default, all emails will be fetched from all folders in the specified account.
        This could take considerable time to index.
        Its highly recommended to use the filters below to filter the emails fetched from Exchange.
        Each filter is applied together. For example, if you specify the
        category 'Red category' and 'ERP' folder, we will fetch the latest 100
        emails marked with the 'Red category' located in the 'ERP' folder.
      </Text>
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
            formBodyBuilder={(values) => (
                <>
                    {TextArrayFieldBuilder({
                        name: "exchange_categories",
                        label: "Categories:",
                        subtext:
                            "Specify 0 or more categories to index. For example, specifying the category " +
                            "'Red category' will cause us to only index emails marked with the Red category. " +
                            "If no categories are specified, the latest emails in your mailbox will be indexed. ",
                        })(values)}
                    {TextArrayFieldBuilder({
                        name: "exchange_folders",
                        label: "Folders:",
                        subtext:
                            "Specify 0 or more folders to index. For example, specifying the folder " +
                            "'Inbox/ERP' will cause us to only index emails in the ERP inbox folder. " +
                            "If no folders are specified, We will fetch emails from all folders. ",
                        })(values)}
                    <TextFormField
                        name="exchange_max_poll_size"
                        label="Exchange Fetch Maximum:"
                        subtext={
                            "Specify the maximum number of emails to fetch from Exchange per poll. The default is 100. " +
                            "If you have specified categories, we will fetch the maximum for each catagory." +
                            "Set this to be slightly higher then the number of emails you expect to be modified in an hour. " +
                            "This is not how many emails will be indexed, but rather how many emails will be fetched from Exchange."
                    }
                />
            </>
            )}
            validationSchema={Yup.object().shape({
              exchange_categories: Yup.array()
                .of(Yup.string().required("Categories must be strings"))
                .required(),
                exchange_folders: Yup.array()
                .of(Yup.string().required("Folders must be strings")),
                exchange_max_poll_size: Yup.number().required("Please enter a number"),
            })}
            formBody={<></>}
            initialValues={{
              exchange_categories: [],
              exchange_folders: [],
              exchange_max_poll_size: 100,
            }}
            credentialId={exchangeCredential.id}
            refreshFreq={10 * 60} // 10 minutes
          />
        </Card>
        </>
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

      <AdminPageTitle icon={<ExchangeIcon size={32} />} title="Exchange" />

      <MainSection />
    </div>
  );
}
