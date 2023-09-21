"use client";

import * as Yup from "yup";
import { JiraIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  Credential,
  JiraConfig,
  JiraCredentialJson,
  ConnectorIndexingStatus,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { usePublicCredentials } from "@/lib/hooks";

// Copied from the `extract_jira_project` function
const extractJiraProject = (url: string): string | null => {
  const parsedUrl = new URL(url);
  const splitPath = parsedUrl.pathname.split("/");
  const projectPos = splitPath.indexOf("projects");
  if (projectPos !== -1 && splitPath.length > projectPos + 1) {
    const jiraProject = splitPath[projectPos + 1];
    return jiraProject;
  }
  return null;
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
    isValidating: isCredentialsValidating,
    refreshCredentials,
  } = usePublicCredentials();

  if (
    isConnectorIndexingStatusesLoading ||
    isCredentialsLoading ||
    isCredentialsValidating
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (isConnectorIndexingStatusesError || !connectorIndexingStatuses) {
    return <div>Failed to load connectors</div>;
  }

  if (isCredentialsError || !credentialsData) {
    return <div>Failed to load credentials</div>;
  }

  const jiraConnectorIndexingStatuses: ConnectorIndexingStatus<
    JiraConfig,
    JiraCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "jira"
  );
  const jiraCredential = credentialsData.filter(
    (credential) => credential.credential_json?.jira_api_token
  )[0];

  return (
    <>
      {popup}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Credentials
      </h2>

      {jiraCredential ? (
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
              {jiraCredential.credential_json?.jira_api_token}
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                if (jiraConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                const response = await adminDeleteCredential(jiraCredential.id);
                if (response.ok) {
                  setPopup({
                    type: "success",
                    message: "Successfully deleted credential!",
                  });
                } else {
                  const errorMsg = await response.text();
                  setPopup({
                    type: "error",
                    message: `Failed to delete credential - ${errorMsg}`,
                  });
                }
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
            To use the Jira connector, first follow the guide{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/jira#setting-up"
            >
              here
            </a>{" "}
            to generate an Access Token.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<JiraCredentialJson>
              formBody={
                <>
                  <TextFormField name="jira_user_email" label="Username:" />
                  <TextFormField
                    name="jira_api_token"
                    label="Access Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                jira_user_email: Yup.string().required(
                  "Please enter your username on Jira"
                ),
                jira_api_token: Yup.string().required(
                  "Please enter your Jira access token"
                ),
              })}
              initialValues={{
                jira_user_email: "",
                jira_api_token: "",
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

      {/* TODO: make this periodic */}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Which spaces do you want to make searchable?
      </h2>
      {jiraCredential ? (
        <>
          {" "}
          <p className="text-sm mb-4">
            Specify any link to a Jira page below and click &quot;Index&quot; to
            Index. Based on the provided link, we will index the ENTIRE PROJECT,
            not just the specified page. For example, entering{" "}
            <i>
              https://danswer.atlassian.net/jira/software/projects/DAN/boards/1
            </i>{" "}
            and clicking the Index button will index the whole <i>DAN</i> Jira
            project.
          </p>
          {jiraConnectorIndexingStatuses.length > 0 && (
            <>
              <p className="text-sm mb-2">
                We pull the latest pages and comments from each space listed
                below every <b>10</b> minutes.
              </p>
              <div className="mb-2">
                <ConnectorsTable<JiraConfig, JiraCredentialJson>
                  connectorIndexingStatuses={jiraConnectorIndexingStatuses}
                  liveCredential={jiraCredential}
                  getCredential={(credential) => {
                    return (
                      <div>
                        <p>{credential.credential_json.jira_api_token}</p>
                      </div>
                    );
                  }}
                  onCredentialLink={async (connectorId) => {
                    if (jiraCredential) {
                      await linkCredential(connectorId, jiraCredential.id);
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
                            connector.connector_specific_config.jira_project_url
                          }
                        >
                          {connector.connector_specific_config.jira_project_url}
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
            <h2 className="font-bold mb-3">Add a New Project</h2>
            <ConnectorForm<JiraConfig>
              nameBuilder={(values) =>
                `JiraConnector-${values.jira_project_url}`
              }
              ccPairNameBuilder={(values) =>
                extractJiraProject(values.jira_project_url)
              }
              credentialId={jiraCredential.id}
              source="jira"
              inputType="poll"
              formBody={
                <>
                  <TextFormField
                    name="jira_project_url"
                    label="Jira Project URL:"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                jira_project_url: Yup.string().required(
                  "Please enter any link to your jira project e.g. https://danswer.atlassian.net/jira/software/projects/DAN/boards/1"
                ),
              })}
              initialValues={{
                jira_project_url: "",
              }}
              refreshFreq={10 * 60} // 10 minutes
            />
          </div>
        </>
      ) : (
        <>
          <p className="text-sm">
            Please provide your access token in Step 1 first! Once done with
            that, you can then specify which Jira projects you want to make
            searchable.
          </p>
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
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <JiraIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Jira</h1>
      </div>
      <Main />
    </div>
  );
}
