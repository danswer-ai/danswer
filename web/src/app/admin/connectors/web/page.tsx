"use client";

import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";

import { LoadingAnimation } from "@/components/Loading";
import {
  GlobeIcon,
  GearIcon,
  ArrowSquareOutIcon,
} from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import {
  SelectorFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus, WebConfig } from "@/lib/types";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { Form, Formik } from "formik";
import { useState } from "react";
import { usePopup } from "@/components/admin/connectors/Popup";
import { createConnector, runConnector } from "@/lib/connector";
import { linkCredential } from "@/lib/credential";
import { FileUpload } from "@/components/admin/connectors/FileUpload";
import { SingleUseConnectorsTable } from "@/components/admin/connectors/table/SingleUseConnectorsTable";
import { Spinner } from "@/components/Spinner";
import { AdminPageTitle } from "@/components/admin/Title";
import { Button, Card, Text, Title } from "@tremor/react";

const SCRAPE_TYPE_TO_PRETTY_NAME = {
  recursive: "Recursive",
  single: "Single Page",
  sitemap: "Sitemap",
  upload: "Upload",
};

export default function Web() {
  const { mutate } = useSWRConfig();
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filesAreUploading, setFilesAreUploading] = useState<boolean>(false);
  const { popup, setPopup } = usePopup();

  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: connectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher
  );

  const webIndexingStatuses: ConnectorIndexingStatus<WebConfig, {}>[] =
    connectorIndexingStatuses?.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "web"
    ) ?? [];

  return (
    <>
      {popup}
      {filesAreUploading && <Spinner />}
      <div className="mx-auto container">
      <AdminPageTitle icon={<GlobeIcon size={32} />} title="Web" />

      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Specify which websites to index
      </Title>
      <p className="text-sm mb-2">
        We re-fetch the latest state of the website once a day.
      </p>
      <Card>
        <div className="mx-auto w-full">
        <Formik
          initialValues={{
            base_url: "",
            web_connector_type: undefined,
          }}
          validationSchema={Yup.object().shape({
            base_url: Yup.string().required(
              "Please enter the website URL to scrape e.g. https://docs.danswer.dev/"
            ),
            web_connector_type: Yup.string()
              .oneOf(["recursive", "single", "sitemap", "upload"])
              .optional(),
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
                await createConnector<WebConfig>({
                  name: `WebConnector-${values.base_url}`,
                  source: "web",
                  input_type: "load_state",
                  connector_specific_config: {
                    base_url: values.base_url,
                    web_connector_type: values.web_connector_type,
                    file_locations: filePaths,
                  },
                  refresh_freq: 60 * 60 * 24, // 1 day,
                  prune_freq: 0, // Don't prune
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
            <Form>
              <TextFormField
                name="base_url"
                label="URL to Index:"
                autoCompleteDisabled={false}
              />

              <div className="w-full">
                <SelectorFormField
                  name="web_connector_type"
                  label="Scrape Method:"
                  options={[
                    {
                      name: "Recursive",
                      value: "recursive",
                      description:
                        "Recursively index all pages that share the same base URL.",
                    },
                    {
                      name: "Single Page",
                      value: "single",
                      description: "Index only the specified page.",
                    },
                    {
                      name: "Sitemap",
                      value: "sitemap",
                      description:
                        "Enter the sitemap url or the root of the site which we can scan for a sitemap",
                    },
                    {
                      name: "Upload",
                      value: "upload",
                      description:
                        "Given a file upload where every line is a URL, parse all the URLs provided",
                    },
                  ]}
                />
              </div>              
              {values.web_connector_type === "upload" ? (
              <>
                <p className="mb-1 font-medium">Files:</p>
                <FileUpload
                  selectedFiles={selectedFiles}
                  setSelectedFiles={setSelectedFiles}
                  message="Upload a txt file containing the urls of the website you want to scrape"
                />
                <div className="flex">
                  <Button
                    className="mt-4 w-64 mx-auto"
                    size="xs"
                    color="green"
                    type="submit"
                    disabled={
                      selectedFiles.length === 0 ||
                      !values.base_url ||
                      isSubmitting
                    }
                  >
                    Upload!
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="flex">
                  <Button
                    className="mt-4 w-64 mx-auto"
                    size="xs"
                    color="green"
                    type="submit"
                    disabled={
                      selectedFiles.length === 1 ||
                      !values.base_url ||
                      isSubmitting
                    }
                  >
                    Connect!
                  </Button>
                </div>
              </>
            )}
            </Form>
          )}
        </Formik>
      </div>
    </Card>
    <Title className="mb-2 mt-6 ml-auto mr-auto">
        Already Indexed Websites
      </Title>
      {isConnectorIndexingStatusesLoading ? (
        <LoadingAnimation text="Loading" />
      ) : connectorIndexingStatusesError || !connectorIndexingStatuses ? (
        <div>Error loading indexing history</div>
      ) : webIndexingStatuses.length > 0 ? (
        <ConnectorsTable<WebConfig, {}>
          connectorIndexingStatuses={webIndexingStatuses}
          specialColumns={[
            {
              header: "Base URL",
              key: "base_url",
              getValue: (
                ccPairStatus: ConnectorIndexingStatus<WebConfig, any>
              ) => {
                const connectorConfig =
                  ccPairStatus.connector.connector_specific_config;
                return (
                  <div className="flex w-fit">
                    <a
                      className="text-blue-500 ml-1 my-auto flex"
                      href={connectorConfig.base_url}
                    >
                      {connectorConfig.base_url}
                      <ArrowSquareOutIcon className="my-auto flex flex-shrink-0 text-blue-500" />
                    </a>
                    <a
                      className="my-auto"
                      href={`/admin/connector/${ccPairStatus.cc_pair_id}`}
                    >
                      <GearIcon className="ml-2 my-auto flex flex-shrink-0 text-gray-400" />
                    </a>
                  </div>
                );
              },
            },
            {
              header: "Scrape Method",
              key: "web_connector_type",
              getValue: (ccPairStatus) => {
                const connectorConfig =
                  ccPairStatus.connector.connector_specific_config;
                return connectorConfig.web_connector_type
                  ? SCRAPE_TYPE_TO_PRETTY_NAME[
                      connectorConfig.web_connector_type
                    ]
                  : "Recursive";
              },
            },
          ]}
          onUpdate={() => mutate("/api/manage/admin/connector/indexing-status")}
        />
      ) : (
        <p className="text-sm">No indexed websites found</p>
      )}
    </div>
    </>
  );
}