"use client";

import * as Yup from "yup";
import { TrashIcon, SalesforceIcon } from "@/components/icons/icons";
import { errorHandlingFetcher as fetcher } from "@/lib/fetcher";
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
import { Text, Title, Button } from "@tremor/react";
import { Card, CardContent } from "@/components/ui/card";

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
      connectorIndexingStatus.connector.source === "salesforce"
  );

  const SalesforceCredential: Credential<SalesforceCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.sf_username
    );

  return (
    <>
      <Text>
        The Salesforce connector allows you to index and search through your
        Salesforce data. Once setup, all indicated Salesforce data will be will
        be queryable within enMedD CHP.
      </Text>

      <Title className="mt-6 mb-2 ml-auto mr-auto">
        Step 1: Provide Salesforce credentials
      </Title>
      {SalesforceCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <Text className="my-auto">Existing SalesForce Username: </Text>
            <Text className="my-auto ml-1 italic">
              {SalesforceCredential.credential_json.sf_username}
            </Text>
            <Button
              className="p-1 ml-1 rounded hover:bg-hover"
              onClick={async () => {
                await adminDeleteCredential(SalesforceCredential.id);
                refreshCredentials();
              }}
              variant="light"
            >
              <TrashIcon />
            </Button>
          </div>
        </>
      ) : (
        <>
          <Text className="mb-2">
            As a first step, please provide the Salesforce admin account&apos;s
            username, password, and Salesforce security token. You can follow
            the guide{" "}
            <a
              target="_blank"
              href="https://docs.danswer.dev/connectors/Salesforce"
              className="text-link"
            >
              here
            </a>{" "}
            to create get your Salesforce Security Token.
          </Text>
          <Card className="mt-2">
            <CardContent>
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
            </CardContent>
          </Card>
        </>
      )}

      <Title className="mt-6 mb-2 ml-auto mr-auto">
        Step 2: Manage Salesforce Connector
      </Title>

      {SalesforceConnectorIndexingStatuses.length > 0 && (
        <>
          <Text className="mb-2">
            The latest state of your Salesforce objects are fetched every 10
            minutes.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<SalesforceConfig, SalesforceCredentialJson>
              connectorIndexingStatuses={SalesforceConnectorIndexingStatuses}
              liveCredential={SalesforceCredential}
              getCredential={(credential) =>
                credential.credential_json.sf_security_token
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
                    return `${connectorConfig.requested_objects}`;
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
          <CardContent>
            <ConnectorForm<SalesforceConfig>
              nameBuilder={(values) =>
                values.requested_objects && values.requested_objects.length > 0
                  ? `Salesforce-${values.requested_objects.join("-")}`
                  : "Salesforce"
              }
              ccPairNameBuilder={(values) =>
                values.requested_objects && values.requested_objects.length > 0
                  ? `Salesforce-${values.requested_objects.join("-")}`
                  : "Salesforce"
              }
              source="salesforce"
              inputType="poll"
              // formBody={<></>}
              formBodyBuilder={TextArrayFieldBuilder({
                name: "requested_objects",
                label: "Specify Salesforce objects to organize by:",
                subtext: (
                  <>
                    <br />
                    Specify the Salesforce object types you want us to index.{" "}
                    <br />
                    <br />
                    Click
                    <a
                      href="https://docs.danswer.dev/connectors/salesforce#an_example"
                      className="text-blue-500"
                      rel="noopener noreferrer"
                    >
                      {" "}
                      here{" "}
                    </a>
                    for an example of how enMedD CHP uses the objects. <br />
                    <br />
                    If unsure, don&apos;t specify any objects and enMedD CHP
                    will default to indexing by &apos;Account&apos;.
                    <br />
                    <br />
                    Hint: Use the singular form of the object name (e.g.,
                    &apos;Opportunity&apos; instead of
                    &apos;Opportunities&apos;).
                  </>
                ),
              })}
              validationSchema={Yup.object().shape({
                requested_objects: Yup.array()
                  .of(
                    Yup.string().required(
                      "Salesforce object names must be strings"
                    )
                  )
                  .required(),
              })}
              initialValues={{
                requested_objects: [],
              }}
              credentialId={SalesforceCredential.id}
              refreshFreq={10 * 60} // 10 minutes
            />
          </CardContent>
        </Card>
      ) : (
        <Text>
          Please provide all Salesforce info in Step 1 first! Once you&apos;re
          done with that, you can then specify which Salesforce objects you want
          to make searchable.
        </Text>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="container mx-auto">
      <div>
        <HealthCheckBanner />
      </div>

      <AdminPageTitle icon={<SalesforceIcon size={32} />} title="Salesforce" />

      <MainSection />
    </div>
  );
}
