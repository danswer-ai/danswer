"use client";

import * as Yup from "yup";
import { GoogleDriveIcon } from "@/components/icons/icons";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { useRouter } from "next/navigation";
import { Popup, PopupSpec } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { Button } from "@/components/Button";
import {
  ConnectorIndexingStatus,
  Credential,
  GoogleDriveConfig,
  GoogleDriveCredentialJson,
} from "@/lib/types";
import { deleteConnector } from "@/lib/connector";
import { StatusRow } from "@/components/admin/connectors/table/ConnectorsTable";
import { setupGoogleDriveOAuth } from "@/lib/googleDrive";
import Cookies from "js-cookie";
import { GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME } from "@/lib/constants";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { TextArrayFieldBuilder } from "@/components/admin/connectors/Field";

const AppCredentialUpload = ({
  setPopup,
}: {
  setPopup: (popupSpec: PopupSpec | null) => void;
}) => {
  const [appCredentialJsonStr, setAppCredentialJsonStr] = useState<
    string | undefined
  >();

  return (
    <>
      <input
        className={
          "mr-3 text-sm text-gray-900 border border-gray-300 rounded-lg " +
          "cursor-pointer bg-gray-50 dark:text-gray-400 focus:outline-none " +
          "dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400"
        }
        type="file"
        accept=".json"
        onChange={(event) => {
          if (!event.target.files) {
            return;
          }
          const file = event.target.files[0];
          const reader = new FileReader();

          reader.onload = function (loadEvent) {
            if (!loadEvent?.target?.result) {
              return;
            }
            const fileContents = loadEvent.target.result;
            setAppCredentialJsonStr(fileContents as string);
          };

          reader.readAsText(file);
        }}
      />

      <Button
        disabled={!appCredentialJsonStr}
        onClick={async () => {
          const response = await fetch(
            "/api/manage/admin/connector/google-drive/app-credential",
            {
              method: "PUT",
              headers: {
                "Content-Type": "application/json",
              },
              body: appCredentialJsonStr,
            }
          );
          if (response.ok) {
            setPopup({
              message: "Successfully uploaded app credentials",
              type: "success",
            });
          } else {
            setPopup({
              message: `Failed to upload app credentials - ${response.status}`,
              type: "error",
            });
          }
        }}
      >
        Upload
      </Button>
    </>
  );
};

interface GoogleDriveConnectorManagementProps {
  googleDrivePublicCredential:
    | Credential<GoogleDriveCredentialJson>
    | undefined;
  googleDriveConnectorIndexingStatus: ConnectorIndexingStatus<GoogleDriveConfig> | null;
  credentialIsLinked: boolean;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

const GoogleDriveConnectorManagement = ({
  googleDrivePublicCredential,
  googleDriveConnectorIndexingStatus,
  credentialIsLinked,
  setPopup,
}: GoogleDriveConnectorManagementProps) => {
  const { mutate } = useSWRConfig();

  if (!googleDrivePublicCredential) {
    return (
      <p className="text-sm">
        Please authenticate with Google Drive as described in Step 2! Once done
        with that, you can then move on to enable this connector.
      </p>
    );
  }

  // NOTE: if the connector has no credential linked, then it will not be
  // returned by the indexing-status API
  if (!googleDriveConnectorIndexingStatus) {
    return (
      <>
        <p className="text-sm mb-2">
          Fill out the form below to create a connector. We will refresh the
          latest documents from Google Drive every <b>10</b> minutes.
        </p>
        <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
          <h2 className="font-bold mb-3">Add Connector</h2>
          <ConnectorForm<GoogleDriveConfig>
            nameBuilder={(values) =>
              `GoogleDriveConnector-${values.folder_paths.join("_")}`
            }
            source="google_drive"
            inputType="poll"
            formBodyBuilder={TextArrayFieldBuilder({
              name: "folder_paths",
              label: "Folder paths:",
              subtext:
                "Specify 0 or more folder paths to index! For example, specifying the path " +
                "'Engineering/Materials' will cause us to only index all files contained " +
                "within the 'Materials' folder within the 'Engineering' folder. " +
                "If no folder paths are specified, we will index all documents in your drive.",
            })}
            validationSchema={Yup.object().shape({
              folder_paths: Yup.array()
                .of(
                  Yup.string().required(
                    "Please specify a folder path for your google drive e.g. 'Engineering/Materials'"
                  )
                )
                .required(),
            })}
            initialValues={{
              folder_paths: [],
            }}
            refreshFreq={10 * 60} // 10 minutes
            onSubmit={async (isSuccess, responseJson) => {
              if (isSuccess && responseJson) {
                await linkCredential(
                  responseJson.id,
                  googleDrivePublicCredential.id
                );
                mutate("/api/manage/admin/connector/indexing-status");
              }
            }}
          />
        </div>
      </>
    );
  }

  // If the connector has no credential, we will just hit the ^ section.
  // Leaving this in for now in case we want to change this behavior later
  // if (!credentialIsLinked) {
  //   <>
  //     <p className="text-sm mb-2">
  //       Click the button below to link your credentials! Once this is done, all
  //       public documents in your Google Drive will be searchable. We will
  //       refresh the latest documents every <b>10</b> minutes.
  //     </p>
  //     <Button
  //       onClick={async () => {
  //         await linkCredential(
  //           googleDriveConnectorIndexingStatus.connector.id,
  //           googleDrivePublicCredential.id
  //         );
  //         setPopup({
  //           message: "Successfully linked credentials!",
  //           type: "success",
  //         });
  //         mutate("/api/manage/admin/connector/indexing-status");
  //       }}
  //     >
  //       Link Credentials
  //     </Button>
  //   </>;
  // }

  return (
    <div>
      <div className="text-sm">
        <div className="flex">
          The Google Drive connector is setup! <b className="mx-2">Status:</b>{" "}
          <StatusRow
            connectorIndexingStatus={googleDriveConnectorIndexingStatus}
            hasCredentialsIssue={
              googleDriveConnectorIndexingStatus.connector.credential_ids
                .length === 0
            }
            setPopup={setPopup}
            onUpdate={() => {
              mutate("/api/manage/admin/connector/indexing-status");
            }}
          />
        </div>
        {googleDriveConnectorIndexingStatus.connector.connector_specific_config
          .folder_paths.length > 0 && (
          <div className="mt-3">
            It is setup to index the following folders:{" "}
            <div className="mx-2">
              {googleDriveConnectorIndexingStatus.connector.connector_specific_config.folder_paths.map(
                (path) => (
                  <div key={path}>
                    - <i>{path}</i>
                  </div>
                )
              )}
            </div>
          </div>
        )}
        <p className="mt-3">
          Checkout the{" "}
          <a href="/admin/indexing/status" className="text-blue-500">
            status page
          </a>{" "}
          for the latest indexing status. We fetch the latest documents from
          Google Drive every <b>10</b> minutes.
        </p>
      </div>
      <Button
        onClick={() => {
          deleteConnector(googleDriveConnectorIndexingStatus.connector.id).then(
            (errorMsg) => {
              if (errorMsg) {
                setPopup({
                  message: `Unable to delete existing connector - ${errorMsg}`,
                  type: "error",
                });
              } else {
                setPopup({
                  message: "Successfully deleted connector!",
                  type: "success",
                });
                mutate("/api/manage/admin/connector/indexing-status");
              }
            }
          );
        }}
        className="mt-2"
      >
        Delete Connector
      </Button>
    </div>
  );
};

const Main = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const {
    data: appCredentialData,
    isLoading: isAppCredentialLoading,
    error: isAppCredentialError,
  } = useSWR<{ client_id: string }>(
    "/api/manage/admin/connector/google-drive/app-credential",
    fetcher
  );
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: isCredentialsError,
  } = useSWR<Credential<GoogleDriveCredentialJson>[]>(
    "/api/manage/credential",
    fetcher
  );

  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const setPopupWithExpiration = (popupSpec: PopupSpec | null) => {
    setPopup(popupSpec);
    setTimeout(() => {
      setPopup(null);
    }, 4000);
  };

  if (
    (!appCredentialData && isAppCredentialLoading) ||
    (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
    (!credentialsData && isCredentialsLoading)
  ) {
    return (
      <div className="mx-auto">
        <LoadingAnimation text="" />
      </div>
    );
  }

  if (isCredentialsError || !credentialsData) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">Failed to load credentials.</div>
      </div>
    );
  }

  if (isConnectorIndexingStatusesError || !connectorIndexingStatuses) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">Failed to load connectors.</div>
      </div>
    );
  }

  if (isAppCredentialError) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">
          Error loading Google Drive app credentials. Contact an administrator.
        </div>
      </div>
    );
  }

  const googleDrivePublicCredential = credentialsData.find(
    (credential) =>
      credential.credential_json?.google_drive_tokens && credential.public_doc
  );
  const googleDriveConnectorIndexingStatuses: ConnectorIndexingStatus<GoogleDriveConfig>[] =
    connectorIndexingStatuses.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "google_drive"
    );
  const googleDriveConnectorIndexingStatus =
    googleDriveConnectorIndexingStatuses[0];

  const credentialIsLinked =
    googleDriveConnectorIndexingStatus !== undefined &&
    googleDrivePublicCredential !== undefined &&
    googleDriveConnectorIndexingStatus.connector.credential_ids.includes(
      googleDrivePublicCredential.id
    );

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your app Credentials
      </h2>
      <div className="mt-2">
        {appCredentialData?.client_id ? (
          <div className="text-sm">
            <div>
              Found existing app credentials with the following{" "}
              <b>Client ID:</b>
              <p className="italic mt-1">{appCredentialData.client_id}</p>
            </div>
            <div className="mt-4">
              If you want to update these credentials, upload a new
              credentials.json file below.
              <div className="mt-2">
                <AppCredentialUpload
                  setPopup={(popup) => {
                    mutate(
                      "/api/manage/admin/connector/google-drive/app-credential"
                    );
                    setPopupWithExpiration(popup);
                  }}
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <p className="text-sm">
              Follow the guide{" "}
              <a
                className="text-blue-500"
                target="_blank"
                href="https://docs.danswer.dev/connectors/google_drive#authorization"
              >
                here
              </a>{" "}
              to setup your google app in your company workspace. Download the
              credentials.json, and upload it here.
            </p>
            <AppCredentialUpload
              setPopup={(popup) => {
                mutate(
                  "/api/manage/admin/connector/google-drive/app-credential"
                );
                setPopupWithExpiration(popup);
              }}
            />
          </>
        )}
      </div>

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Authenticate with Danswer
      </h2>
      <div className="text-sm mb-4">
        {googleDrivePublicCredential ? (
          <>
            <p className="mb-2">
              <i>Existing credential already setup!</i>
            </p>
            <Button
              onClick={async () => {
                await deleteCredential(googleDrivePublicCredential.id);
                setPopup({
                  message: "Successfully revoked access to Google Drive!",
                  type: "success",
                });
                mutate("/api/manage/credential");
              }}
            >
              Revoke Access
            </Button>
          </>
        ) : (
          <>
            <p className="mb-2">
              Next, you must provide credentials via OAuth. This gives us read
              access to the docs you have access to in your google drive
              account.
            </p>
            <Button
              onClick={async () => {
                const [authUrl, errorMsg] = await setupGoogleDriveOAuth({
                  isPublic: true,
                });
                if (authUrl) {
                  // cookie used by callback to determine where to finally redirect to
                  Cookies.set(GOOGLE_DRIVE_AUTH_IS_ADMIN_COOKIE_NAME, "true", {
                    path: "/",
                  });
                  router.push(authUrl);
                  return;
                }

                setPopup({
                  message: errorMsg,
                  type: "error",
                });
              }}
            >
              Authenticate with Google Drive
            </Button>
          </>
        )}
      </div>

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 3: Start Indexing!
      </h2>
      <GoogleDriveConnectorManagement
        googleDrivePublicCredential={googleDrivePublicCredential}
        googleDriveConnectorIndexingStatus={googleDriveConnectorIndexingStatus}
        credentialIsLinked={credentialIsLinked}
        setPopup={setPopupWithExpiration}
      />
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
        <GoogleDriveIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Google Drive</h1>
      </div>

      <Main />
    </div>
  );
}
