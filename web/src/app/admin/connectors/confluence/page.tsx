"use client";

import * as Yup from "yup";
import { ConfluenceIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  ConfluenceCredentialJson,
  ConfluenceConfig,
  Connector,
  Credential,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";

const Main = () => {
  const { mutate } = useSWRConfig();
  const {
    data: connectorsData,
    isLoading: isConnectorsLoading,
    error: isConnectorsError,
  } = useSWR<Connector<ConfluenceConfig>[]>("/api/admin/connector", fetcher);
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    isValidating: isCredentialsValidating,
    error: isCredentialsError,
  } = useSWR<Credential<ConfluenceCredentialJson>[]>(
    "/api/admin/credential",
    fetcher
  );

  if (isConnectorsLoading || isCredentialsLoading || isCredentialsValidating) {
    return <LoadingAnimation text="Loading" />;
  }

  if (isConnectorsError || !connectorsData) {
    return <div>Failed to load connectors</div>;
  }

  if (isCredentialsError || !credentialsData) {
    return <div>Failed to load credentials</div>;
  }

  const confluenceConnectors = connectorsData.filter(
    (connector) => connector.source === "confluence"
  );
  const confluenceCredential = credentialsData.filter(
    (credential) => credential.credential_json?.confluence_access_token
  )[0];

  return (
    <>
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Credentials
      </h2>

      {confluenceCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <div>
              <div className="flex">
                <p className="my-auto">Existing Username: </p>
                <p className="ml-1 italic my-auto max-w-md truncate">
                  {confluenceCredential.credential_json?.confluence_username}
                </p>{" "}
              </div>
              <div className="flex">
                <p className="my-auto">Existing Access Token: </p>
                <p className="ml-1 italic my-auto max-w-md truncate">
                  {
                    confluenceCredential.credential_json
                      ?.confluence_access_token
                  }
                </p>
              </div>
            </div>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                await deleteCredential(confluenceCredential.id);
                mutate("/api/admin/credential");
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            To use the Confluence connector, you must first follow the guide
            described{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/slack#setting-up"
            >
              here
            </a>{" "}
            to generate an Access Token.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<ConfluenceCredentialJson>
              formBody={
                <>
                  <TextFormField name="confluence_username" label="Username:" />
                  <TextFormField
                    name="confluence_access_token"
                    label="Access Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                confluence_username: Yup.string().required(
                  "Please enter your username on Confluence"
                ),
                confluence_access_token: Yup.string().required(
                  "Please enter your Confluence access token"
                ),
              })}
              initialValues={{
                confluence_username: "",
                confluence_access_token: "",
              }}
              onSubmit={(isSuccess) => {
                if (isSuccess) {
                  mutate("/api/admin/credential");
                }
              }}
            />
          </div>
        </>
      )}

      {/* TODO: make this periodic */}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Which spaces do you want to make searchable?
      </h2>
      <p className="text-sm mb-4">
        To use the Confluence connector, you must first follow the guide
        described{" "}
        <a
          className="text-blue-500"
          href="https://docs.danswer.dev/connectors/slack#setting-up"
        >
          here
        </a>{" "}
        to give the Danswer backend read access to your documents. Once that is
        setup, specify any link to a Confluence page below and click
        &quot;Index&quot; to Index. Based on the provided link, we will index
        the ENTIRE SPACE, not just the specified page. For example, entering{" "}
        <i>https://danswer.atlassian.net/wiki/spaces/SD/overview</i> and
        clicking the Index button will index the whole <i>SD</i> Confluence
        space.
      </p>

      {connectorsData.length > 0 && (
        <>
          <p className="text-sm mb-2">
            We pull the latest pages and comments from each space listed below
            every <b>10</b> minutes.
          </p>
          <div className="mb-2">
            <ConnectorsTable<ConfluenceConfig, ConfluenceCredentialJson>
              connectors={confluenceConnectors}
              liveCredential={confluenceCredential}
              getCredential={(credential) => {
                return (
                  <div>
                    <p className="mb-0.5">
                      {credential.credential_json.confluence_username}
                    </p>
                    <p>{credential.credential_json.confluence_access_token}</p>
                  </div>
                );
              }}
              onCredentialLink={async (connectorId) => {
                if (confluenceCredential) {
                  await linkCredential(connectorId, confluenceCredential.id);
                  mutate("/api/admin/connector");
                }
              }}
              specialColumns={[
                {
                  header: "Url",
                  key: "url",
                  getValue: (connector) => (
                    <a
                      className="text-blue-500"
                      href={connector.connector_specific_config.wiki_page_url}
                    >
                      {connector.connector_specific_config.wiki_page_url}
                    </a>
                  ),
                },
              ]}
              onUpdate={() => mutate("/api/admin/connector")}
            />
          </div>
        </>
      )}

      <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
        <h2 className="font-bold mb-3">Add a New Space</h2>
        <ConnectorForm<ConfluenceConfig>
          nameBuilder={(values) =>
            `ConfluenceConnector-${values.wiki_page_url}`
          }
          source="confluence"
          inputType="load_state"
          formBody={
            <>
              <TextFormField name="wiki_page_url" label="Confluence URL:" />
            </>
          }
          validationSchema={Yup.object().shape({
            wiki_page_url: Yup.string().required(
              "Please enter any link to your confluence e.g. https://danswer.atlassian.net/wiki/spaces/SD/overview"
            ),
          })}
          initialValues={{
            wiki_page_url: "",
          }}
          refreshFreq={10 * 60} // 10 minutes
          onSubmit={async (isSuccess, responseJson) => {
            if (isSuccess && responseJson) {
              await linkCredential(responseJson.id, confluenceCredential.id);
              mutate("/api/admin/connector");
            }
          }}
        />
      </div>
    </>
  );
};

export default function Page() {
  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <ConfluenceIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Confluence</h1>
      </div>
      <Main />
    </div>
  );
}
