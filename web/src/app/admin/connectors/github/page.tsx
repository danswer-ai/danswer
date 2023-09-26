"use client";

import * as Yup from "yup";
import { GithubIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import {
  GithubConfig,
  GithubCredentialJson,
  Credential,
  ConnectorIndexingStatus,
} from "@/lib/types";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { LoadingAnimation } from "@/components/Loading";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePublicCredentials } from "@/lib/hooks";

const Main = () => {
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

  const githubConnectorIndexingStatuses: ConnectorIndexingStatus<
    GithubConfig,
    GithubCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "github"
  );
  const githubCredential: Credential<GithubCredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.github_access_token
    );

  return (
    <>
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your access token
      </h2>
      {githubCredential ? (
        <>
          {" "}
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Access Token: </p>
            <p className="ml-1 italic my-auto">
              {githubCredential.credential_json.github_access_token}
            </p>{" "}
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                await adminDeleteCredential(githubCredential.id);
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
            If you don&apos;t have an access token, read the guide{" "}
            <a
              className="text-blue-500"
              href="https://docs.danswer.dev/connectors/github"
            >
              here
            </a>{" "}
            on how to get one from Github.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<GithubCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="github_access_token"
                    label="Access Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                github_access_token: Yup.string().required(
                  "Please enter the access token for Github"
                ),
              })}
              initialValues={{
                github_access_token: "",
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
        Step 2: Which repositories do you want to make searchable?
      </h2>

      {githubConnectorIndexingStatuses.length > 0 && (
        <>
          <p className="text-sm mb-2">
            We pull the latest Pull Requests from each repository listed below
            every <b>10</b> minutes.
          </p>
          <div className="mb-2">
            <ConnectorsTable<GithubConfig, GithubCredentialJson>
              connectorIndexingStatuses={githubConnectorIndexingStatuses}
              liveCredential={githubCredential}
              getCredential={(credential) =>
                credential.credential_json.github_access_token
              }
              onCredentialLink={async (connectorId) => {
                if (githubCredential) {
                  await linkCredential(connectorId, githubCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              specialColumns={[
                {
                  header: "Repository",
                  key: "repository",
                  getValue: (connector) =>
                    `${connector.connector_specific_config.repo_owner}/${connector.connector_specific_config.repo_name}`,
                },
              ]}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </div>
        </>
      )}

      {githubCredential ? (
        <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
          <h2 className="font-bold mb-3">Connect to a New Repository</h2>
          <ConnectorForm<GithubConfig>
            nameBuilder={(values) =>
              `GithubConnector-${values.repo_owner}/${values.repo_name}`
            }
            ccPairNameBuilder={(values) =>
              `${values.repo_owner}/${values.repo_name}`
            }
            source="github"
            inputType="load_state"
            formBody={
              <>
                <TextFormField name="repo_owner" label="Repository Owner:" />
                <TextFormField name="repo_name" label="Repository Name:" />
              </>
            }
            validationSchema={Yup.object().shape({
              repo_owner: Yup.string().required(
                "Please enter the owner of the repository to index e.g. danswer-ai"
              ),
              repo_name: Yup.string().required(
                "Please enter the name of the repository to index e.g. danswer "
              ),
              include_prs: Yup.boolean().required(),
              include_issues: Yup.boolean().required(),
            })}
            initialValues={{
              repo_owner: "",
              repo_name: "",
              include_prs: true,
              include_issues: true,
            }}
            refreshFreq={10 * 60} // 10 minutes
            credentialId={githubCredential.id}
          />
        </div>
      ) : (
        <p className="text-sm">
          Please provide your access token in Step 1 first! Once done with that,
          you can then specify which Github repositories you want to make
          searchable.
        </p>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="container mx-auto">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <GithubIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Github PRs</h1>
      </div>
      <Main />
    </div>
  );
}
