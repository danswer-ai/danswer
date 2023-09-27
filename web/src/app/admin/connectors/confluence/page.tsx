"use client";

import * as Yup from "yup";
import { ConfluenceIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  ConfluenceCredentialJson,
  ConfluenceConfig,
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

// Copied from the `extract_confluence_keys_from_url` function
const extractSpaceFromUrl = (wikiUrl: string): string | null => {
  if (!wikiUrl.includes(".atlassian.net/wiki/spaces/")) {
    return null;
  }

  const parsedUrl = new URL(wikiUrl);
  const space = parsedUrl.pathname.split("/")[3];
  return space;
};

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

  const confluenceConnectorIndexingStatuses: ConnectorIndexingStatus<
    ConfluenceConfig,
    ConfluenceCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "confluence"
  );
  const confluenceCredential: Credential<ConfluenceCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.confluence_access_token
    );

  return (
    <>
      {popup}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your access token
      </h2>

      {confluenceCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            {/* <div className="flex">
                <p className="my-auto">Existing Username: </p>
                <p className="ml-1 italic my-auto max-w-md truncate">
                  {confluenceCredential.credential_json?.confluence_username}
                </p>{" "}
              </div> */}
            <p className="my-auto">Existing Access Token: </p>
            <p className="ml-1 italic my-auto max-w-md truncate">
              {confluenceCredential.credential_json?.confluence_access_token}
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                if (confluenceConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(confluenceCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            To use the Confluence connector, first follow the guide{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/confluence#setting-up"
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
                  refreshCredentials();
                }
              }}
            />
          </div>
        </>
      )}

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Which spaces do you want to make searchable?
      </h2>
      {confluenceCredential ? (
        <>
          <p className="text-sm mb-4">
            Specify any link to a Confluence page below and click
            &quot;Index&quot; to Index. Based on the provided link, we will
            index the ENTIRE SPACE, not just the specified page. For example,
            entering{" "}
            <i>
              https://danswer.atlassian.net/wiki/spaces/Engineering/overview
            </i>{" "}
            and clicking the Index button will index the whole{" "}
            <i>Engineering</i> Confluence space.
          </p>

          {confluenceConnectorIndexingStatuses.length > 0 && (
            <>
              <p className="text-sm mb-2">
                We pull the latest pages and comments from each space listed
                below every <b>10</b> minutes.
              </p>
              <div className="mb-2">
                <ConnectorsTable<ConfluenceConfig, ConfluenceCredentialJson>
                  connectorIndexingStatuses={
                    confluenceConnectorIndexingStatuses
                  }
                  liveCredential={confluenceCredential}
                  getCredential={(credential) => {
                    return (
                      <div>
                        <p>
                          {credential.credential_json.confluence_access_token}
                        </p>
                      </div>
                    );
                  }}
                  onCredentialLink={async (connectorId) => {
                    if (confluenceCredential) {
                      await linkCredential(
                        connectorId,
                        confluenceCredential.id
                      );
                      mutate("/api/manage/admin/connector/indexing-status");
                    }
                  }}
                  specialColumns={[
                    {
                      header: "Url",
                      key: "url",
                      getValue: (connector) => (
                        <a
                          className="text-blue-500"
                          href={
                            connector.connector_specific_config.wiki_page_url
                          }
                        >
                          {connector.connector_specific_config.wiki_page_url}
                        </a>
                      ),
                    },
                  ]}
                  onUpdate={() =>
                    mutate("/api/manage/admin/connector/indexing-status")
                  }
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
              ccPairNameBuilder={(values) =>
                extractSpaceFromUrl(values.wiki_page_url)
              }
              source="confluence"
              inputType="poll"
              formBody={
                <>
                  <TextFormField name="wiki_page_url" label="Confluence URL:" />
                </>
              }
              validationSchema={Yup.object().shape({
                wiki_page_url: Yup.string().required(
                  "Please enter any link to your confluence e.g. https://danswer.atlassian.net/wiki/spaces/Engineering/overview"
                ),
              })}
              initialValues={{
                wiki_page_url: "",
              }}
              refreshFreq={10 * 60} // 10 minutes
              credentialId={confluenceCredential.id}
            />
          </div>
        </>
      ) : (
        <p className="text-sm">
          Please provide your access token in Step 1 first! Once done with that,
          you can then specify which Confluence spaces you want to make
          searchable.
        </p>
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
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <ConfluenceIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Confluence</h1>
      </div>
      <Main />
    </div>
  );
}
