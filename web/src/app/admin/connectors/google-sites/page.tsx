"use client";

import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";

import { LoadingAnimation } from "@/components/Loading";
import { GoogleSitesIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus, GoogleSitesConfig } from "@/lib/types";
import { Form, Formik } from "formik";
import { useState } from "react";
import { usePopup } from "@/components/admin/connectors/Popup";
import { createConnector, runConnector } from "@/lib/connector";
import { linkCredential } from "@/lib/credential";
import { FileUpload } from "@/components/admin/connectors/FileUpload";
import { SingleUseConnectorsTable } from "@/components/admin/connectors/table/SingleUseConnectorsTable";
import { Spinner } from "@/components/Spinner";

export default function GoogleSites() {
  const { mutate } = useSWRConfig();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filesAreUploading, setFilesAreUploading] = useState<boolean>(false);
  const { popup, setPopup } = usePopup();

  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    fetcher
  );

  const googleSitesIndexingStatuses: ConnectorIndexingStatus<
    GoogleSitesConfig,
    {}
  >[] =
    connectorIndexingStatuses?.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "google_sites"
    ) ?? [];

  return (
    <>
      {popup}
      {filesAreUploading && <Spinner />}
      <div className="mx-auto container">
        <div className="mb-4">
          <HealthCheckBanner />
        </div>
        <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
          <GoogleSitesIcon size={32} />
          <h1 className="text-3xl font-bold pl-2">Google Sites</h1>
        </div>
        <p className="text-sm mb-2">
          For an in-depth guide on how to setup this connector, check out{" "}
          <a
            href="https://docs.danswer.dev/connectors/google_sites"
            target="_blank"
            className="text-blue-500"
          >
            the documentation
          </a>
          .
        </p>

        <div className="mt-4">
          <h2 className="font-bold text-xl mb-2">Upload Files</h2>
          <div className="mx-auto w-full">
            <Formik
              initialValues={{
                base_url: "",
              }}
              validationSchema={Yup.object().shape({
                base_url: Yup.string().required("Base URL is required"),
              })}
              onSubmit={async (values, formikHelpers) => {
                const uploadCreateAndTriggerConnector = async () => {
                  const formData = new FormData();

                  selectedFiles.forEach((file) => {
                    formData.append("files", file);
                  });

                  const response = await fetch(
                    "/api/manage/admin/connector/file/upload",
                    { method: "POST", body: formData }
                  );
                  const responseJson = await response.json();
                  if (!response.ok) {
                    setPopup({
                      message: `Unable to upload files - ${responseJson.detail}`,
                      type: "error",
                    });
                    return;
                  }

                  const filePaths = responseJson.file_paths as string[];
                  const [connectorErrorMsg, connector] =
                    await createConnector<GoogleSitesConfig>({
                      name: `GoogleSitesConnector-${values.base_url}`,
                      source: "google_sites",
                      input_type: "load_state",
                      connector_specific_config: {
                        base_url: values.base_url,
                        zip_path: filePaths[0],
                      },
                      refresh_freq: null,
                      disabled: false,
                    });
                  if (connectorErrorMsg || !connector) {
                    setPopup({
                      message: `Unable to create connector - ${connectorErrorMsg}`,
                      type: "error",
                    });
                    return;
                  }

                  const credentialResponse = await linkCredential(
                    connector.id,
                    0,
                    values.base_url
                  );
                  if (!credentialResponse.ok) {
                    const credentialResponseJson =
                      await credentialResponse.json();
                    setPopup({
                      message: `Unable to link connector to credential - ${credentialResponseJson.detail}`,
                      type: "error",
                    });
                    return;
                  }

                  const runConnectorErrorMsg = await runConnector(
                    connector.id,
                    [0]
                  );
                  if (runConnectorErrorMsg) {
                    setPopup({
                      message: `Unable to run connector - ${runConnectorErrorMsg}`,
                      type: "error",
                    });
                    return;
                  }

                  mutate("/api/manage/admin/connector/indexing-status");
                  setSelectedFiles([]);
                  formikHelpers.resetForm();
                  setPopup({
                    type: "success",
                    message: "Successfully uploaded files!",
                  });
                };

                setFilesAreUploading(true);
                try {
                  await uploadCreateAndTriggerConnector();
                } catch (e) {
                  console.log("Failed to index filels: ", e);
                }
                setFilesAreUploading(false);
              }}
            >
              {({ values, isSubmitting }) => (
                <Form className="p-3 border border-gray-600 rounded">
                  <TextFormField
                    name="base_url"
                    label="Base URL:"
                    placeholder={`Base URL of your Google Site e.g. https://sites.google.com/view/your-site`}
                    subtext="This will be used to generate links for each page."
                    autoCompleteDisabled={true}
                  />

                  <p className="mb-1 font-medium">Files:</p>
                  <FileUpload
                    selectedFiles={selectedFiles}
                    setSelectedFiles={setSelectedFiles}
                    message="Upload a zip file containing the HTML of your Google Site"
                  />
                  <button
                    className={
                      "bg-slate-500 hover:bg-slate-700 text-white " +
                      "font-bold py-2 px-4 rounded focus:outline-none " +
                      "focus:shadow-outline w-full mx-auto mt-4"
                    }
                    type="submit"
                    disabled={
                      selectedFiles.length !== 1 ||
                      !values.base_url ||
                      isSubmitting
                    }
                  >
                    Upload!
                  </button>
                </Form>
              )}
            </Formik>
          </div>
        </div>

        <h2 className="font-bold mb-2 mt-6 ml-auto mr-auto">
          Existing Google Site Connectors
        </h2>
        {isConnectorIndexingStatusesLoading ? (
          <LoadingAnimation text="Loading" />
        ) : isConnectorIndexingStatusesError || !connectorIndexingStatuses ? (
          <div>Error loading indexing history</div>
        ) : googleSitesIndexingStatuses.length > 0 ? (
          <SingleUseConnectorsTable<GoogleSitesConfig, {}>
            connectorIndexingStatuses={googleSitesIndexingStatuses}
            specialColumns={[
              {
                header: "Base URL",
                key: "base_url",
                getValue: (ccPairStatus) => {
                  const connectorConfig =
                    ccPairStatus.connector.connector_specific_config;
                  return (
                    <a
                      className="text-blue-500"
                      href={connectorConfig.base_url}
                    >
                      {connectorConfig.base_url}
                    </a>
                  );
                },
              },
            ]}
            onUpdate={() =>
              mutate("/api/manage/admin/connector/indexing-status")
            }
          />
        ) : (
          <p className="text-sm">No indexed Google Sites found</p>
        )}
      </div>
    </>
  );
}
