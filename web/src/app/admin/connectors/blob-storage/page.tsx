"use client";

import { AdminPageTitle } from "@/components/admin/Title";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { BlobIcon, R2Icon, S3Icon, TrashIcon } from "@/components/icons/icons";
import { LoadingAnimation } from "@/components/Loading";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
import { TextFormField } from "@/components/admin/connectors/Field";
import { usePopup } from "@/components/admin/connectors/Popup";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { adminDeleteCredential, linkCredential } from "@/lib/credential";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import { usePublicCredentials } from "@/lib/hooks";
import {
  ConnectorIndexingStatus,
  Credential,
  S3Config,
  S3CredentialJson,
  R2Config,
  R2CredentialJson,
} from "@/lib/types";
import { Card, Select, SelectItem, Text, Title } from "@tremor/react";
import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";
import { useState } from "react";

const R2Main = () => {
  const { popup, setPopup } = usePopup();

  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: connectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: credentialsError,
    refreshCredentials,
  } = usePublicCredentials();

  if (
    (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
    (!credentialsData && isCredentialsLoading)
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (connectorIndexingStatusesError || !connectorIndexingStatuses) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={connectorIndexingStatusesError?.info?.detail}
      />
    );
  }

  if (credentialsError || !credentialsData) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={credentialsError?.info?.detail}
      />
    );
  }

  const r2ConnectorIndexingStatuses: ConnectorIndexingStatus<
    R2Config,
    R2CredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "r2"
  );
  // console.log(credentialsData)
  // console.log(credentialsData[0].credential_json?.profile_name)

  const r2Credential: Credential<R2CredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.account_id
    );

  return (
    <>
      {popup}
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your access info
      </Title>
      {r2Credential ? (
        <>
          {" "}
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing R2 Access Key ID: </p>
            <p className="ml-1 italic my-auto">
              {r2Credential.credential_json.r2_access_key_id}
            </p>
            {", "}
            <p className="ml-1 my-auto">Account ID: </p>
            <p className="ml-1 italic my-auto">
              {r2Credential.credential_json.account_id}
            </p>{" "}
            <button
              className="ml-1 hover:bg-hover rounded p-1"
              onClick={async () => {
                if (r2ConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(r2Credential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <Text>
            <ul className="list-disc mt-2 ml-4">
              <li>
                Provide your R2 Access Key ID, Secret Access Key, and Account ID
                for authentication.
              </li>
              <li>These credentials will be used to access your R2 buckets.</li>
            </ul>
          </Text>
          <Card className="mt-4">
            <CredentialForm<R2CredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="r2_access_key_id"
                    label="R2 Access Key ID:"
                  />
                  <TextFormField
                    name="r2_secret_access_key"
                    label="R2 Secret Access Key:"
                  />
                  <TextFormField name="account_id" label="Account ID:" />
                </>
              }
              validationSchema={Yup.object().shape({
                r2_access_key_id: Yup.string().required(
                  "R2 Access Key ID is required"
                ),
                r2_secret_access_key: Yup.string().required(
                  "R2 Secret Access Key is required"
                ),
                account_id: Yup.string().required("Account ID is required"),
              })}
              initialValues={{
                r2_access_key_id: "",
                r2_secret_access_key: "",
                account_id: "",
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
        Step 2: Which R2 bucket do you want to make searchable?
      </Title>

      {r2ConnectorIndexingStatuses.length > 0 && (
        <>
          <Title className="mb-2 mt-6 ml-auto mr-auto">
            R2 indexing status
          </Title>
          <Text className="mb-2">
            The latest changes are fetched every 10 minutes.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<R2Config, R2CredentialJson>
              connectorIndexingStatuses={r2ConnectorIndexingStatuses}
              liveCredential={r2Credential}
              getCredential={(credential) => {
                return <div></div>;
              }}
              onCredentialLink={async (connectorId) => {
                if (r2Credential) {
                  await linkCredential(connectorId, r2Credential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </div>
        </>
      )}

      {r2Credential && (
        <>
          <Card className="mt-4">
            <h2 className="font-bold mb-3">Create Connection</h2>
            <Text className="mb-4">
              Press connect below to start the connection to your R2 bucket.
            </Text>
            <ConnectorForm<R2Config>
              nameBuilder={(values) => `R2Connector-${values.bucket_name}`}
              ccPairNameBuilder={(values) =>
                `R2Connector-${values.bucket_name}`
              }
              source="blob"
              inputType="poll"
              formBodyBuilder={(values) => (
                <div>
                  <TextFormField name="bucket_name" label="Bucket Name:" />
                  <TextFormField
                    name="prefix"
                    label="Path Prefix (optional):"
                  />
                </div>
              )}
              validationSchema={Yup.object().shape({
                bucket_type: Yup.string()
                  .oneOf(["R2"])
                  .required("Bucket type must be R2"),
                bucket_name: Yup.string().required(
                  "Please enter the name of the R2 bucket to index, e.g. my-test-bucket"
                ),
                prefix: Yup.string().default(""),
              })}
              initialValues={{
                bucket_type: "R2",
                bucket_name: "",
                prefix: "",
              }}
              // validationSchema={Yup.object().shape({
              //   bucket_name: Yup.string().required(
              //     "Please enter the name of the R2 bucket to index, e.g. my-test-bucket"
              //   ),
              //   prefix: Yup.string().default("")
              // })}
              // initialValues={{
              //   bucket_type: "R2",
              //   bucket_name: "",
              //   prefix: "",
              // }}
              refreshFreq={10 * 60} // 10 minutes
              credentialId={r2Credential.id}
            />
          </Card>
        </>
      )}
    </>
  );
};

const S3Main = () => {
  const { popup, setPopup } = usePopup();

  const { mutate } = useSWRConfig();
  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: connectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher
  );
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: credentialsError,
    refreshCredentials,
  } = usePublicCredentials();

  if (
    (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
    (!credentialsData && isCredentialsLoading)
  ) {
    return <LoadingAnimation text="Loading" />;
  }

  if (connectorIndexingStatusesError || !connectorIndexingStatuses) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={connectorIndexingStatusesError?.info?.detail}
      />
    );
  }

  if (credentialsError || !credentialsData) {
    return (
      <ErrorCallout
        errorTitle="Something went wrong :("
        errorMsg={credentialsError?.info?.detail}
      />
    );
  }

  const s3ConnectorIndexingStatuses: ConnectorIndexingStatus<
    S3Config,
    S3CredentialJson
  >[] = connectorIndexingStatuses.filter(
    (connectorIndexingStatus) =>
      connectorIndexingStatus.connector.source === "s3"
  );

  const s3Credential: Credential<S3CredentialJson> | undefined =
    credentialsData.find(
      (credential) => credential.credential_json?.aws_profile_name
    );

  return (
    <>
      {popup}
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Provide your access info
      </Title>
      {s3Credential ? (
        <>
          {" "}
          <div className="flex mb-1 text-sm">
            <p className="my-auto">Existing AWS Access Key ID: </p>
            <p className="ml-1 italic my-auto">
              {s3Credential.credential_json.aws_access_key_id}
            </p>
            {", "}
            <p className="ml-1 my-auto">Profile Name: </p>
            <p className="ml-1 italic my-auto">
              {s3Credential.credential_json.aws_profile_name}
            </p>{" "}
            <button
              className="ml-1 hover:bg-hover rounded p-1"
              onClick={async () => {
                if (s3ConnectorIndexingStatuses.length > 0) {
                  setPopup({
                    type: "error",
                    message:
                      "Must delete all connectors before deleting credentials",
                  });
                  return;
                }
                await adminDeleteCredential(s3Credential.id);
                refreshCredentials();
              }}
            >
              <TrashIcon />
            </button>
          </div>
        </>
      ) : (
        <>
          <Text>
            <ul className="list-disc mt-2 ml-4">
              <li>
                If AWS Access Key ID and AWS Secret Access Key are provided,
                they will be used for authenticating the connector.
              </li>
              <li>Otherwise, the Profile Name will be used (if provided).</li>
              <li>
                If no credentials are provided, then the connector will try to
                authenticate with any default AWS credentials available.
              </li>
            </ul>
          </Text>
          <Card className="mt-4">
            <CredentialForm<S3CredentialJson>
              formBody={
                <>
                  <TextFormField
                    name="aws_access_key_id"
                    label="AWS Access Key ID:"
                  />
                  <TextFormField
                    name="aws_secret_access_key"
                    label="AWS Secret Access Key:"
                  />
                  <TextFormField name="profile_name" label="Profile Name:" />
                </>
              }
              validationSchema={Yup.object().shape({
                aws_access_key_id: Yup.string().default(""),
                aws_secret_access_key: Yup.string().default(""),
                aws_profile_name: Yup.string().default(""),
              })}
              initialValues={{
                aws_access_key_id: "",
                aws_secret_access_key: "",
                aws_profile_name: "",
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
        Step 2: Which S3 bucket do you want to make searchable?
      </Title>

      {s3ConnectorIndexingStatuses.length > 0 && (
        <>
          <Title className="mb-2 mt-6 ml-auto mr-auto">
            S3 indexing status
          </Title>
          <Text className="mb-2">
            The latest changes are fetched every 10 minutes.
          </Text>
          <div className="mb-2">
            <ConnectorsTable<S3Config, S3CredentialJson>
              connectorIndexingStatuses={s3ConnectorIndexingStatuses}
              liveCredential={s3Credential}
              getCredential={(credential) => {
                return <div></div>;
              }}
              onCredentialLink={async (connectorId) => {
                if (s3Credential) {
                  await linkCredential(connectorId, s3Credential.id);
                  mutate("/api/manage/admin/connector/indexing-status");
                }
              }}
              onUpdate={() =>
                mutate("/api/manage/admin/connector/indexing-status")
              }
            />
          </div>
        </>
      )}

      {s3Credential && (
        <>
          <Card className="mt-4">
            <h2 className="font-bold mb-3">Create Connection</h2>
            <Text className="mb-4">
              Press connect below to start the connection to your S3 bucket.
            </Text>
            <ConnectorForm<S3Config>
              nameBuilder={(values) => `S3Connector-${values.bucket_name}`}
              ccPairNameBuilder={(values) =>
                `S3Connector-${values.bucket_name}`
              }
              source="blob"
              inputType="poll"
              formBodyBuilder={(values) => (
                <div>
                  <TextFormField name="bucket_name" label="Bucket Name:" />
                  <TextFormField
                    name="prefix"
                    label="Path Prefix (optional):"
                  />
                </div>
              )}
              validationSchema={Yup.object().shape({
                bucket_type: Yup.string()
                  .oneOf(["S3"])
                  .required("Bucket type must be S3"),
                bucket_name: Yup.string().required(
                  "Please enter the name of the S3 bucket to index, e.g. my-test-bucket"
                ),
                prefix: Yup.string().default(""),
              })}
              initialValues={{
                bucket_type: "S3",
                bucket_name: "",
                prefix: "",
              }}
              // validationSchema={Yup.object().shape({
              //   bucket_name: Yup.string().required(
              //     "Please enter the name of the S3 bucket to index, e.g. my-test-bucket"
              //   ),
              //   prefix: Yup.string().default("")
              // })}
              // initialValues={{
              //   bucket_name: "",
              //   prefix: "",
              // }}
              refreshFreq={10 * 60} // 10 minutes
              credentialId={s3Credential.id}
            />
          </Card>
        </>
      )}
    </>
  );
};

type StorageOption = {
  value: string;
  label: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
};

type BlobStorageSelectorProps = {
  onStorageSelect: (value: string) => void;
  currentStorage: string;
};

Credential;
const BlobStorageSelector: React.FC<BlobStorageSelectorProps> = ({
  onStorageSelect,
  currentStorage,
}) => {
  const storageOptions: StorageOption[] = [
    { value: "s3", label: "Amazon S3", icon: S3Icon },
    { value: "r2", label: "Cloudflare R2", icon: R2Icon },
    { value: "gcs", label: "Google Cloud Storage", icon: S3Icon },
  ];

  return (
    <div className=" max-w-sm ">
      <Select
        value={currentStorage}
        onValueChange={onStorageSelect}
        placeholder="Select blob storage"
      >
        {storageOptions.map((option) => (
          <SelectItem
            key={option.value}
            value={option.value}
            icon={option.icon}
          >
            {option.label}
          </SelectItem>
        ))}
      </Select>
    </div>
  );
};

export default function Page() {
  const [selectedStorage, setSelectedStorage] = useState<string>("s3");

  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <AdminPageTitle icon={<BlobIcon size={32} />} title="Blob Storage" />
      <BlobStorageSelector
        onStorageSelect={setSelectedStorage}
        currentStorage={selectedStorage}
      />
      {selectedStorage == "s3" ? (
        <S3Main key={1} />
      ) : (
        selectedStorage == "r2" && <R2Main key={2} />
      )}
    </div>
  );
}

// "use client";

// import { AdminPageTitle } from "@/components/admin/Title";
// import { HealthCheckBanner } from "@/components/health/healthcheck";
// import { ChevronDownIcon, ChevronUpIcon, S3Icon, R2Icon, BlobIcon, TrashIcon } from "@/components/icons/icons";
// import { LoadingAnimation } from "@/components/Loading";
// import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
// import { CredentialForm } from "@/components/admin/connectors/CredentialForm";
// import { TextFormField } from "@/components/admin/connectors/Field";
// import { usePopup } from "@/components/admin/connectors/Popup";
// import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
// import { adminDeleteCredential, linkCredential } from "@/lib/credential";
// import { errorHandlingFetcher } from "@/lib/fetcher";
// import { ErrorCallout } from "@/components/ErrorCallout";
// import { usePublicCredentials } from "@/lib/hooks";
// import {
//   ConnectorIndexingStatus,
//   Credential,
//   S3Config,
//   S3CredentialJson,
// } from "@/lib/types";
// import { Card, Select, SelectItem, Text, Title } from "@tremor/react";
// import useSWR, { useSWRConfig } from "swr";
// import * as Yup from "yup";
// import { useState } from "react";

// const Main = () => {
//   const [selectedStorage, setSelectedStorage] = useState<string>('s3');

//   const [credential, setCredential] = useState<any>(null);
//   const [isCredentialFormExpanded, setIsCredentialFormExpanded] = useState(true);

//   const { popup, setPopup } = usePopup();

//   const { mutate } = useSWRConfig();
//   const {
//     data: connectorIndexingStatuses,
//     isLoading: isConnectorIndexingStatusesLoading,
//     error: connectorIndexingStatusesError,
//   } = useSWR<ConnectorIndexingStatus<any, any>[]>(
//     "/api/manage/admin/connector/indexing-status",
//     errorHandlingFetcher
//   );
//   const {
//     data: credentialsData,
//     isLoading: isCredentialsLoading,
//     error: credentialsError,
//     refreshCredentials,
//   } = usePublicCredentials();

//   if (
//     (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) ||
//     (!credentialsData && isCredentialsLoading)
//   ) {
//     return <LoadingAnimation text="Loading" />;
//   }

//   if (connectorIndexingStatusesError || !connectorIndexingStatuses) {
//     return (
//       <ErrorCallout
//         errorTitle="Something went wrong :("
//         errorMsg={connectorIndexingStatusesError?.info?.detail}
//       />
//     );
//   }

//   if (credentialsError || !credentialsData) {
//     return (
//       <ErrorCallout
//         errorTitle="Something went wrong :("
//         errorMsg={credentialsError?.info?.detail}
//       />
//     );
//   }
//   // Type for storage options
//   type StorageOption = {
//     value: string;
//     label: string;
//     icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
//   };

//   const blobConnectorIndexingStatuses: ConnectorIndexingStatus<
//     S3Config,
//     S3CredentialJson
//   >[] = connectorIndexingStatuses.filter(
//     (connectorIndexingStatus) =>
//       connectorIndexingStatus.connector.source === "blob"
//   );

//   type BlobStorageSelectorProps = {
//     onStorageSelect: (value: string) => void;
//     currentStorage: string;
//   };

//   type CredentialJson = {
//     [key: string]: string;
//   };

//   type Credential = {
//     id: string;
//     credential_json: CredentialJson;
//   };

//   const BlobStorageSelector: React.FC<BlobStorageSelectorProps> = ({ onStorageSelect, currentStorage }) => {
//     const storageOptions: StorageOption[] = [
//       { value: 's3', label: 'Amazon S3', icon: S3Icon },
//       { value: 'r2', label: 'Cloudflare R2', icon: R2Icon },
//       { value: 'gcs', label: 'Google Cloud Storage', icon: S3Icon },
//     ];

//     return (
//       <div className=" max-w-sm ">
//         <Select
//           value={currentStorage}
//           onValueChange={onStorageSelect}
//           placeholder="Select blob storage"
//         >
//           {storageOptions.map((option) => (
//             <SelectItem key={option.value} value={option.value} icon={option.icon}>
//               {option.label}
//             </SelectItem>
//           ))}
//         </Select>
//       </div>
//     );
//   };

//   const getCredentialForm = () => {
//     const commonProps = {
//       onSubmit: () => { setIsCredentialFormExpanded(false) }
//       // (
//       // isSuccess: boolean) => {
//       // if (isSuccess) {
//       //   refreshCredentials();
//       // }
//       // }
//     };

//     if (selectedStorage === 's3') {
//       return (
//         <CredentialForm
//           {...commonProps}
//           formBody={
//             <>
//               <TextFormField name="aws_access_key_id" label="AWS Access Key ID:" />
//               <TextFormField name="aws_secret_access_key" label="AWS Secret Access Key:" />
//               <TextFormField name="profile_name" label="Profile Name:" />
//             </>
//           }
//           validationSchema={Yup.object().shape({
//             aws_access_key_id: Yup.string().default(""),
//             aws_secret_access_key: Yup.string().default(""),
//             profile_name: Yup.string().default(""),
//           })}
//           initialValues={{
//             aws_access_key_id: "",
//             aws_secret_access_key: "",
//             profile_name: "",
//           }}
//         />
//       );
//     } else {
//       return (
//         <CredentialForm
//           {...commonProps}
//           formBody={
//             <>
//               <TextFormField name="r2_account_id" label="R2 Account ID:" />
//               <TextFormField name="r2_access_key_id" label="R2 Access Key ID:" />
//               <TextFormField name="r2_secret_access_key" label="R2 Secret Access Key:" />
//             </>
//           }
//           validationSchema={Yup.object().shape({
//             r2_account_id: Yup.string().required("R2 Account ID is required"),
//             r2_access_key_id: Yup.string().required("R2 Access Key ID is required"),
//             r2_secret_access_key: Yup.string().required("R2 Secret Access Key is required"),
//           })}
//           initialValues={{
//             r2_account_id: "",
//             r2_access_key_id: "",
//             r2_secret_access_key: "",
//           }}
//         />
//       );
//     }
//   };

//   const getConnectorForm = () => {
//     if (!credential) return null;

//     const commonProps = {
//       credentialId: credential.id,
//       refreshFreq: 10 * 60, // 10 minutes
//       inputType: "poll",
//       formBodyBuilder: (values: any) => (
//         <div>
//           <TextFormField name="bucket_name" label="Bucket Name:" />
//           <TextFormField name="prefix" label="Folder Name (optional):" />
//         </div>
//       ),
//       validationSchema: Yup.object().shape({
//         bucket_name: Yup.string().required("Please enter the name of the bucket to index"),
//         prefix: Yup.string().default("")
//       }),
//       initialValues: {
//         bucket_name: "",
//         prefix: "",
//       }
//     };

//     return (
//       <ConnectorForm
//         {...commonProps}
//         nameBuilder={(values) => `${selectedStorage.toUpperCase()}Connector-${values.bucket_name}`}
//         ccPairNameBuilder={(values) => `${selectedStorage.toUpperCase()}Connector-${values.bucket_name}`}
//         source={selectedStorage}
//       />
//     );
//   };

//   return (
//     <>
//       <div className="mx-auto container">
//         <div className="mb-4">
//           <HealthCheckBanner />
//         </div>
//         <AdminPageTitle icon={<BlobIcon size={32} />} title={`Blob Storage ${selectedStorage && `- ${selectedStorage.toUpperCase()}`}`} />
//         {popup}
//         <Title className="mb-2 mt-6 ml-auto mr-auto">
//           Step 1: Pick the blob storage
//         </Title>
//         <BlobStorageSelector
//           onStorageSelect={setSelectedStorage}
//           currentStorage={selectedStorage}
//         />

//         <Title className="mb-2 mt-6 ml-auto mr-auto">
//           Step 2: Provide your access info
//         </Title>
//         {credential ? (
//           <Card className="mt-4">
//             <div className="flex justify-between items-center cursor-pointer" onClick={() => setIsCredentialFormExpanded(!isCredentialFormExpanded)}>
//               <div className="flex items-center">
//                 <p className="my-auto">Existing Credential: </p>
//                 <p className="ml-1 italic my-auto">
//                   {JSON.stringify(credential.credential_json)}
//                 </p>
//               </div>
//               {isCredentialFormExpanded ? <ChevronUpIcon /> : <ChevronDownIcon />}
//             </div>
//             z
//             {isCredentialFormExpanded && (
//               <div className="mt-4">
//                 {getCredentialForm()}

//                 <button
//                   className="mt-2 p-2 bg-red-500 text-white rounded"
//                   onClick={async () => {
//                     if (blobConnectorIndexingStatuses.length > 0) {
//                       setPopup({
//                         type: "error",
//                         message: "Must delete all connectors before deleting credentials",
//                       });
//                       return;
//                     }
//                     await adminDeleteCredential(credential.id);
//                     refreshCredentials();
//                   }}
//                 >
//                   <TrashIcon /> Delete Credential
//                 </button>
//               </div>
//             )}
//           </Card>
//         ) : (
//           <Card className="mt-4">
//             {getCredentialForm()}
//           </Card>
//         )}

//         <Title className="mb-2 mt-6 ml-auto mr-auto">
//           Step 3: Which bucket do you want to make searchable?
//         </Title>

//         {blobConnectorIndexingStatuses.length > 0 && (
//           <>
//             <Title className="mb-2 mt-6 ml-auto mr-auto">
//               {selectedStorage.toUpperCase()} indexing status
//             </Title>
//             <Text className="mb-2">
//               The latest changes are fetched every 10 minutes.
//             </Text>
//             <div className="mb-2">

//               <ConnectorsTable
//                 connectorIndexingStatuses={connectorIndexingStatuses}
//                 liveCredential={credential}
//                 getCredential={(cred) => <div>{JSON.stringify(cred)}</div>}
//                 onCredentialLink={async (connectorId) => {
//                   if (credential) {
//                     await linkCredential(connectorId, credential.id);
//                     mutate("/api/manage/admin/connector/indexing-status");
//                   }
//                 }}
//                 onUpdate={() =>
//                   mutate("/api/manage/admin/connector/indexing-status")
//                 }
//               />
//             </div>
//           </>
//         )}

//         {credential && (
//           <Card className="mt-4">
//             <h2 className="font-bold mb-3">Create Connection</h2>
//             <Text className="mb-4">
//               Press connect below to start the connection to your {selectedStorage.toUpperCase()} bucket.
//             </Text>
//             {getConnectorForm()}
//           </Card>
//         )}

//       </div>
//     </>
//   );
// };

// export default Main
