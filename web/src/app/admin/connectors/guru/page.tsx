"use client";

import * as Yup from "yup";
import { GuruIcon, TrashIcon } from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import {
  Credential,
  ConnectorIndexingStatus,
  GuruConfig,
  GuruCredentialJson,
} from "@/lib/types";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { usePublicCredentials } from "@/lib/hooks";

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
    isValidating: isCredentialsValidating,
    error: isCredentialsError,
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

  const guruConnectorIndexingStatuses: ConnectorIndexingStatus<
    GuruConfig,
    GuruCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "guru"
  );
  const guruCredential: Credential<GuruCredentialJson> | undefined =
    credentialsData.find((credential) => credential.credential_json?.guru_user);

  return (
    <>
      {popup}
      <p className="text-sm">
        This connector allows you to sync all your Guru Cards into Danswer.
      </p>

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Credentials
      </h2>

      {guruCredential ? (
        <>
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing Access Token: </p>
            <p className="ml-1 italic my-auto max-w-md truncate">
              {guruCredential.credential_json?.guru_user_token}
            </p>
            <button
              className="ml-1 hover:bg-gray-700 rounded-full p-1"
              onClick={async () => {
                if (guruConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(guruCredential.id);
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
            To use the Guru connector, first follow the guide{" "}
            <a
              className="text-blue-500"
              href="https://help.getguru.com/s/article/how-to-obtain-your-api-credentials"
              target="_blank"
            >
              here
            </a>{" "}
            to generate a User Token.
          </p>
          <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
            <CredentialForm<GuruCredentialJson>
              formBody={
                <>
                  <TextFormField name="guru_user" label="Username:" />
                  <TextFormField
                    name="guru_user_token"
                    label="User Token:"
                    type="password"
                  />
                </>
              }
              validationSchema={Yup.object().shape({
                guru_user: Yup.string().required(
                  "Please enter your Guru username"
                ),
                guru_user_token: Yup.string().required(
                  "Please enter your Guru access token"
                ),
              })}
              initialValues={{
                guru_user: "",
                guru_user_token: "",
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
        Step 2: Start indexing!
      </h2>
      {guruCredential ? (
        !guruConnectorIndexingStatuses.length ? (
          <>
            <p className="text-sm mb-2">
              Click the button below to start indexing! We will pull the latest
              features, components, and products from Guru every <b>10</b>{" "}
              minutes.
            </p>
            <div className="flex">
              <ConnectorForm<GuruConfig>
                nameBuilder={() => "GuruConnector"}
                ccPairNameBuilder={() => "Guru"}
                source="guru"
                inputType="poll"
                formBody={null}
                validationSchema={Yup.object().shape({})}
                initialValues={{}}
                refreshFreq={10 * 60} // 10 minutes
                credentialId={guruCredential.id}
              />
            </div>
          </>
        ) : (
          <>
            <p className="text-sm mb-2">
              Guru connector is setup! We are pulling the latest cards from Guru
              every <b>10</b> minutes.
            </p>
            <ConnectorsTable<GuruConfig, GuruCredentialJson>
              connectorIndexingStatuses={guruConnectorIndexingStatuses}
              liveCredential={guruCredential}
              getCredential={(credential) => {
                return (
                  <div>
                    <p>{credential.credential_json.guru_user}</p>
                  </div>
                );
              }}
              onCredentialLink={async (connectorId) => {
                if (guruCredential) {
                  await linkCredential(connectorId, guruCredential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </>
        )
      ) : (
        <>
          <p className="text-sm">
            Please provide your access token in Step 1 first! Once done with
            that, you can then start indexing all your Guru cards.
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
        <GuruIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Guru</h1>
      </div>
      <Main />
    </div>
  );
}
