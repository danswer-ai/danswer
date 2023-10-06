"use client";

import * as Yup from "yup";
import { GoogleDriveIcon } from "@/components/icons/icons";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  ConnectorIndexingStatus,
  Credential,
  GoogleDriveConfig,
  GoogleDriveCredentialJson,
  GoogleDriveServiceAccountCredentialJson,
} from "@/lib/types";
import { linkCredential } from "@/lib/credential";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import {
  BooleanFormField,
  TextArrayFieldBuilder,
} from "@/components/admin/connectors/Field";
import { GoogleDriveConnectorsTable } from "./GoogleDriveConnectorsTable";
import { googleDriveConnectorNameBuilder } from "./utils";
import { DriveOAuthSection, DriveJsonUploadSection } from "./Credential";
import { usePublicCredentials } from "@/lib/hooks";

interface GoogleDriveConnectorManagementProps {
  googleDrivePublicCredential?: Credential<GoogleDriveCredentialJson>;
  googleDriveServiceAccountCredential?: Credential<GoogleDriveServiceAccountCredentialJson>;
  googleDriveConnectorIndexingStatus: ConnectorIndexingStatus<
    GoogleDriveConfig,
    GoogleDriveCredentialJson
  > | null;
  googleDriveConnectorIndexingStatuses: ConnectorIndexingStatus<
    GoogleDriveConfig,
    GoogleDriveCredentialJson
  >[];
  credentialIsLinked: boolean;
  setPopup: (popupSpec: PopupSpec | null) => void;
}

const GoogleDriveConnectorManagement = ({
  googleDrivePublicCredential,
  googleDriveServiceAccountCredential,
  googleDriveConnectorIndexingStatus,
  googleDriveConnectorIndexingStatuses,
  credentialIsLinked,
  setPopup,
}: GoogleDriveConnectorManagementProps) => {
  const { mutate } = useSWRConfig();

  const liveCredential =
    googleDrivePublicCredential || googleDriveServiceAccountCredential;
  if (!liveCredential) {
    return (
      <p className="text-sm">
        Please authenticate with Google Drive as described in Step 2! Once done
        with that, you can then move on to enable this connector.
      </p>
    );
  }

  // NOTE: if the connector has no credential linked, then it will not be
  // returned by the indexing-status API
  // if (!googleDriveConnectorIndexingStatus) {
  //   return (
  //     <>
  //       <p className="text-sm mb-2">
  //         Fill out the form below to create a connector. We will refresh the
  //         latest documents from Google Drive every <b>10</b> minutes.
  //       </p>
  //       <div className="border-solid border-gray-600 border rounded-md p-6 mt-4">
  //         <h2 className="font-bold mb-3">Add Connector</h2>
  //         <ConnectorForm<GoogleDriveConfig>
  //           nameBuilder={googleDriveConnectorNameBuilder}
  //           source="google_drive"
  //           inputType="poll"
  //           formBodyBuilder={(values) => (
  //             <div>
  //               {TextArrayFieldBuilder({
  //                 name: "folder_paths",
  //                 label: "Folder Paths",
  //                 subtext:
  //                   "Specify 0 or more folder paths to index! For example, specifying the path " +
  //                   "'Engineering/Materials' will cause us to only index all files contained " +
  //                   "within the 'Materials' folder within the 'Engineering' folder. " +
  //                   "If no folder paths are specified, we will index all documents in your drive.",
  //               })(values)}
  //               <BooleanFormField
  //                 name="include_shared"
  //                 label="Include Shared"
  //               />
  //             </div>
  //           )}
  //           validationSchema={Yup.object().shape({
  //             folder_paths: Yup.array()
  //               .of(
  //                 Yup.string().required(
  //                   "Please specify a folder path for your google drive e.g. 'Engineering/Materials'"
  //                 )
  //               )
  //               .required(),
  //             include_shared: Yup.boolean().required(),
  //           })}
  //           initialValues={{
  //             folder_paths: [],
  //           }}
  //           refreshFreq={10 * 60} // 10 minutes
  //           onSubmit={async (isSuccess, responseJson) => {
  //             if (isSuccess && responseJson) {
  //               await linkCredential(
  //                 responseJson.id,
  //                 googleDrivePublicCredential.id
  //               );
  //               mutate("/api/manage/admin/connector/indexing-status");
  //             }
  //           }}
  //         />
  //       </div>
  //     </>
  //   );
  // }

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
        <div className="my-3">
          {googleDriveConnectorIndexingStatuses.length > 0 ? (
            <>
              Checkout the{" "}
              <a href="/admin/indexing/status" className="text-blue-500">
                status page
              </a>{" "}
              for the latest indexing status. We fetch the latest documents from
              Google Drive every <b>10</b> minutes.
            </>
          ) : (
            <p className="text-sm mb-2">
              Fill out the form below to create a connector. We will refresh the
              latest documents from Google Drive every <b>10</b> minutes.
            </p>
          )}
        </div>
      </div>
      {googleDriveConnectorIndexingStatuses.length > 0 && (
        <>
          <div className="text-sm mb-2 font-bold">Existing Connectors:</div>
          <GoogleDriveConnectorsTable
            googleDriveConnectorIndexingStatuses={
              googleDriveConnectorIndexingStatuses
            }
            setPopup={setPopup}
          />
        </>
      )}

      {googleDriveConnectorIndexingStatuses.length > 0 && (
        <h2 className="font-bold mt-3 text-sm">Add New Connector:</h2>
      )}
      <div className="border-solid border-gray-600 border rounded-md p-6 mt-2">
        <ConnectorForm<GoogleDriveConfig>
          nameBuilder={googleDriveConnectorNameBuilder}
          source="google_drive"
          inputType="poll"
          formBodyBuilder={(values) => (
            <>
              {TextArrayFieldBuilder({
                name: "folder_paths",
                label: "Folder Paths",
                subtext:
                  "Specify 0 or more folder paths to index! For example, specifying the path " +
                  "'Engineering/Materials' will cause us to only index all files contained " +
                  "within the 'Materials' folder within the 'Engineering' folder. " +
                  "If no folder paths are specified, we will index all documents in your drive.",
              })(values)}
              <BooleanFormField
                name="include_shared"
                label="Include Shared Files + Shared Drives"
                subtext={
                  "If checked, then we will also index all documents + drives shared with you. " +
                  "If this is combined with folder paths, then we will only index documents " +
                  "that match both criteria."
                }
              />
              <BooleanFormField
                name="follow_shortcuts"
                label="Follow Shortcuts"
                subtext={
                  "If checked, then will follow shortcuts to files and folder and " +
                  "attempt to index those as well."
                }
              />
            </>
          )}
          validationSchema={Yup.object().shape({
            folder_paths: Yup.array()
              .of(
                Yup.string().required(
                  "Please specify a folder path for your google drive e.g. 'Engineering/Materials'"
                )
              )
              .required(),
            include_shared: Yup.boolean().required(),
            follow_shortcuts: Yup.boolean().required(),
          })}
          initialValues={{
            folder_paths: [],
            include_shared: false,
            follow_shortcuts: false,
          }}
          refreshFreq={10 * 60} // 10 minutes
          credentialId={liveCredential.id}
        />
      </div>
    </div>
  );
};

const Main = () => {
  const {
    data: appCredentialData,
    isLoading: isAppCredentialLoading,
    error: isAppCredentialError,
  } = useSWR<{ client_id: string }>(
    "/api/manage/admin/connector/google-drive/app-credential",
    fetcher
  );
  const {
    data: serviceAccountKeyData,
    isLoading: isServiceAccountKeyLoading,
    error: isServiceAccountKeyError,
  } = useSWR<{ service_account_email: string }>(
    "/api/manage/admin/connector/google-drive/service-account-key",
    fetcher
  );
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

  const { popup, setPopup } = usePopup();

  if (
    (!appCredentialData && isAppCredentialLoading) ||
    (!serviceAccountKeyData && isServiceAccountKeyLoading) ||
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

  if (isAppCredentialError || isServiceAccountKeyError) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">
          Error loading Google Drive app credentials. Contact an administrator.
        </div>
      </div>
    );
  }

  const googleDrivePublicCredential:
    | Credential<GoogleDriveCredentialJson>
    | undefined = credentialsData.find(
    (credential) =>
      credential.credential_json?.google_drive_tokens &&
      credential.user_id === null
  );
  const googleDriveServiceAccountCredential:
    | Credential<GoogleDriveServiceAccountCredentialJson>
    | undefined = credentialsData.find(
    (credential) => credential.credential_json?.google_drive_service_account_key
  );
  const googleDriveConnectorIndexingStatuses: ConnectorIndexingStatus<
    GoogleDriveConfig,
    GoogleDriveCredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "google_drive"
  );
  const googleDriveConnectorIndexingStatus =
    googleDriveConnectorIndexingStatuses[0];

  const credentialIsLinked =
    (googleDriveConnectorIndexingStatus !== undefined &&
      googleDrivePublicCredential !== undefined &&
      googleDriveConnectorIndexingStatus.connector.credential_ids.includes(
        googleDrivePublicCredential.id
      )) ||
    (googleDriveConnectorIndexingStatus !== undefined &&
      googleDriveServiceAccountCredential !== undefined &&
      googleDriveConnectorIndexingStatus.connector.credential_ids.includes(
        googleDriveServiceAccountCredential.id
      ));

  return (
    <>
      {popup}
      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your Credentials
      </h2>
      <DriveJsonUploadSection
        setPopup={setPopup}
        appCredentialData={appCredentialData}
        serviceAccountCredentialData={serviceAccountKeyData}
      />

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 2: Authenticate with Danswer
      </h2>
      <DriveOAuthSection
        setPopup={setPopup}
        refreshCredentials={refreshCredentials}
        googleDrivePublicCredential={googleDrivePublicCredential}
        googleDriveServiceAccountCredential={
          googleDriveServiceAccountCredential
        }
        appCredentialData={appCredentialData}
        serviceAccountKeyData={serviceAccountKeyData}
      />

      <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
        Step 3: Start Indexing!
      </h2>
      <GoogleDriveConnectorManagement
        googleDrivePublicCredential={googleDrivePublicCredential}
        googleDriveServiceAccountCredential={
          googleDriveServiceAccountCredential
        }
        googleDriveConnectorIndexingStatus={googleDriveConnectorIndexingStatus}
        googleDriveConnectorIndexingStatuses={
          googleDriveConnectorIndexingStatuses
        }
        credentialIsLinked={credentialIsLinked}
        setPopup={setPopup}
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
        <GoogleDriveIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Google Drive</h1>
      </div>

      <Main />
    </div>
  );
}
