"use client";

import * as Yup from "yup";
import { TrashIcon, RequestTrackerIcon } from "@/components/icons/icons"; // Make sure you have a Document360 icon
import { fetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { LoadingAnimation } from "@/components/Loading";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  RequestTrackerConfig,
  RequestTrackerCredentialJson,
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

  const requestTrackerConnectorIndexingStatuses: ConnectorIndexingStatus<
    RequestTrackerConfig,
    RequestTrackerCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "requesttracker"
  );

  const requestTrackerCredential:
    | Credential<RequestTrackerCredentialJson>
    | undefined = credentialsData.find(
    (credential) => credential.credential_json?.requesttracker_username
  );

  return (
    <>
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide Request Tracker credentials
      </h2>
      {requestTrackerCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Request Tracker username: </p>
            <p className="ml-1 italic my-auto">
              {requestTrackerCredential.credential_json.requesttracker_username}
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                await adminDeleteCredential(requestTrackerCredential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm mb-2">
            To use the Request Tracker connector, provide a Request Tracker
            username, password, and base url.
          </p>
          <p className="text-sm mb-2">
            This connector currently supports{" "}
            <a href="https://rt-wiki.bestpractical.com/wiki/REST">
              Request Tracker REST API 1.0
            </a>
            ,{" "}
            <b>not the latest REST API 2.0 introduced in Request Tracker 5.0</b>
            .
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<RequestTrackerCredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="requesttracker_username"
                    label="Request Tracker username:"
                  />
                  <TextFormField
                    name="requesttracker_password"
                    label="Request Tracker password:"
                    type="password"
                  />
                  <TextFormField
                    name="requesttracker_base_url"
                    label="Request Tracker base url:"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                requesttracker_username: Yup.string().required(
                  "Please enter your Request Tracker username"
                ),
                requesttracker_password: Yup.string().required(
                  "Please enter your Request Tracker password"
                ),
                requesttracker_base_url: Yup.string()
                  .url()
                  .required(
                    "Please enter the base url of your RT installation"
                  ),
              })}
              initialValues={{
                requesttracker_username: "",
                requesttracker_password: "",
                requesttracker_base_url: "",
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

      {requestTrackerConnectorIndexingStatuses.length > 0 && (
        <>
          <p className="text-sm mb-2">
            We index the most recently updated tickets from each Request Tracker
            instance listed below regularly.
          </p>
          <p className="text-sm mb-2">
            The initial poll at this time retrieves tickets updated in the past
            hour. All subsequent polls execute every ten minutes. This should be
            configurable in the future.
          </p>
          <div className="mb-2">
            <ConnectorsTable<RequestTrackerConfig, RequestTrackerCredentialJson>
              connectorIndexingStatuses={
                requestTrackerConnectorIndexingStatuses
              }
              liveCredential={requestTrackerCredential}
              getCredential={(credential) =>
                credential.credential_json.requesttracker_base_url
              }
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
              onCredentialLink={async (connectorId) => {
                if (requestTrackerCredential) {
                  await linkCredential(
                    connectorId,
                    requestTrackerCredential.id
                  );
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
            />
          </div>
        </>
      )}

      {requestTrackerCredential &&
      requestTrackerConnectorIndexingStatuses.length === 0 ? (
        <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
          <h2 className="font-bold mb-3">
            Step 2: (Re)initialize connection to Request Tracker installation
          </h2>
          <ConnectorForm<RequestTrackerConfig>
            nameBuilder={(values) =>
              `RequestTracker-${requestTrackerCredential.credential_json.requesttracker_base_url}`
            }
            ccPairNameBuilder={(values) =>
              `Request Tracker ${requestTrackerCredential.credential_json.requesttracker_base_url}`
            }
            source="requesttracker"
            inputType="poll"
            validationSchema={Yup.object().shape({})}
            formBody={<></>}
            initialValues={{}}
            credentialId={requestTrackerCredential.id}
            refreshFreq={10 * 60} // 10 minutes
          />
        </div>
      ) : (
        <></>
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
        <RequestTrackerIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Request Tracker</h1>
      </div>
      <MainSection />
    </div>
  );
}
