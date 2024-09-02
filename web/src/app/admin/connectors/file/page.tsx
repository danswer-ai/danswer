"use client";

import useSWR, { useSWRConfig } from "swr";
import * as Yup from "yup";

import { FileIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { ErrorCallout } from "@/components/ErrorCallout";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus, FileConfig } from "@/lib/types";
import { createCredential, linkCredential } from "@/lib/credential";
import { useState } from "react";
import { createConnector, runConnector } from "@/lib/connector";
import { Spinner } from "@/components/Spinner";
import { SingleUseConnectorsTable } from "@/components/admin/connectors/table/SingleUseConnectorsTable";
import { LoadingAnimation } from "@/components/Loading";
import { Form, Formik } from "formik";
import {
  BooleanFormField,
  TextFormField,
} from "@/components/admin/connectors/Field";
import { FileUpload } from "@/components/admin/connectors/FileUpload";
import { getNameFromPath } from "@/lib/fileUtils";
import { Divider, Text } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import IsPublicField from "@/components/admin/connectors/IsPublicField";
import { usePaidEnterpriseFeaturesEnabled } from "@/components/settings/usePaidEnterpriseFeaturesEnabled";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { BackButton } from "@/components/BackButton";
import { useToast } from "@/hooks/use-toast";

const Main = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filesAreUploading, setFilesAreUploading] = useState<boolean>(false);
  const { toast } = useToast();

  const isPaidEnterpriseFeaturesEnabled = usePaidEnterpriseFeaturesEnabled();

  const { mutate } = useSWRConfig();

  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher
  );

  if (!connectorIndexingStatuses && isConnectorIndexingStatusesLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  const fileIndexingStatuses: ConnectorIndexingStatus<FileConfig, {}>[] =
    connectorIndexingStatuses?.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "file"
    ) ?? [];

  return (
    <div>
      {filesAreUploading && <Spinner />}
      <Text className="mb-2">
        Specify files below, click the <b>Upload</b> button, and the contents of
        these files will be searchable via enMedD AI! Currently supported file
        types include <i>.txt</i>, <i>.pdf</i>, <i>.docx</i>, <i>.pptx</i>,{" "}
        <i>.xlsx</i>, <i>.csv</i>, <i>.md</i>, <i>.mdx</i>, <i>.conf</i>,{" "}
        <i>.log</i>, <i>.json</i>, <i>.tsv</i>, <i>.xml</i>, <i>.yml</i>,{" "}
        <i>.yaml</i>, <i>.eml</i>, <i>.epub</i>, and finally <i>.zip</i> files
        (containing supported file types).
      </Text>
      <Text className="mb-3">
        <b>NOTE:</b> if the original document is accessible via a link, you can
        add a line at the very beginning of the file that looks like:
        <div className="flex my-2">
          <div className="mx-auto font-bold">
            #ENMEDD_METADATA={"{"}&quot;link&quot;: &quot;{"<LINK>"}&quot;{"}"}
          </div>
        </div>{" "}
        where <i>{"<LINK>"}</i> is the link to the file. This will enable enMedD
        AI to link users to the original document when they click on the search
        result. More details on this can be found in the{" "}
        <a href="#" className="text-link">
          documentation.
        </a>
      </Text>
      <div className="flex mt-4">
        <div className="mx-auto w-full">
          <Card>
            <CardContent>
              <Formik
                initialValues={{
                  name: "",
                  selectedFiles: [],
                  is_public: isPaidEnterpriseFeaturesEnabled
                    ? false
                    : undefined,
                }}
                validationSchema={Yup.object().shape({
                  name: Yup.string().required(
                    "Please enter a descriptive name for the files"
                  ),
                  ...(isPaidEnterpriseFeaturesEnabled && {
                    is_public: Yup.boolean().required(),
                  }),
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
                      toast({
                        title: "Error",
                        description: `Unable to upload files - ${responseJson.detail}`,
                        variant: "destructive",
                      });
                      return;
                    }

                    const filePaths = responseJson.file_paths as string[];
                    const [connectorErrorMsg, connector] =
                      await createConnector<FileConfig>({
                        name: "FileConnector-" + Date.now(),
                        source: "file",
                        input_type: "load_state",
                        connector_specific_config: {
                          file_locations: filePaths,
                        },
                        refresh_freq: null,
                        prune_freq: 0,
                        disabled: false,
                      });
                    if (connectorErrorMsg || !connector) {
                      toast({
                        title: "Error",
                        description: `Unable to create connector - ${connectorErrorMsg}`,
                        variant: "destructive",
                      });
                      return;
                    }

                    // Since there is no "real" credential associated with a file connector
                    // we create a dummy one here so that we can associate the CC Pair with a
                    // user. This is needed since the user for a CC Pair is found via the credential
                    // associated with it.
                    const createCredentialResponse = await createCredential({
                      credential_json: {},
                      admin_public: true,
                    });
                    if (!createCredentialResponse.ok) {
                      const errorMsg = await createCredentialResponse.text();
                      toast({
                        title: "Error",
                        description: `Error creating credential for CC Pair - ${errorMsg}`,
                        variant: "destructive",
                      });
                      formikHelpers.setSubmitting(false);
                      return;
                    }
                    const credentialId = (await createCredentialResponse.json())
                      .id;

                    const credentialResponse = await linkCredential(
                      connector.id,
                      credentialId,
                      values.name,
                      values.is_public
                    );
                    if (!credentialResponse.ok) {
                      const credentialResponseJson =
                        await credentialResponse.json();
                      toast({
                        title: "Error",
                        description: `Unable to link connector to credential - ${credentialResponseJson.detail}`,
                        variant: "destructive",
                      });
                      return;
                    }

                    const runConnectorErrorMsg = await runConnector(
                      connector.id,
                      [0]
                    );
                    if (runConnectorErrorMsg) {
                      toast({
                        title: "Error",
                        description: `Unable to run connector - ${runConnectorErrorMsg}`,
                        variant: "destructive",
                      });
                      return;
                    }

                    mutate("/api/manage/admin/connector/indexing-status");
                    setSelectedFiles([]);
                    formikHelpers.resetForm();
                    toast({
                      title: "Success",
                      description: "Successfully uploaded files!",
                      variant: "success",
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
                    <h2 className="font-bold  text-xl mb-2">Upload Files</h2>
                    <TextFormField
                      name="name"
                      label="Name:"
                      placeholder={`A name that describes the files e.g. "Onboarding Documents"`}
                      autoCompleteDisabled={true}
                    />

                    <p className="mb-1 font-medium ">Files:</p>
                    <FileUpload
                      selectedFiles={selectedFiles}
                      setSelectedFiles={setSelectedFiles}
                    />

                    {isPaidEnterpriseFeaturesEnabled && (
                      <>
                        <Divider />
                        <IsPublicField />
                        <Divider />
                      </>
                    )}

                    <div className="flex">
                      <Button
                        className="mt-4 w-64 mx-auto"
                        type="submit"
                        disabled={
                          selectedFiles.length === 0 ||
                          !values.name ||
                          isSubmitting
                        }
                      >
                        Upload
                      </Button>
                    </div>
                  </Form>
                )}
              </Formik>
            </CardContent>
          </Card>
        </div>
      </div>

      {fileIndexingStatuses.length > 0 && (
        <div>
          <Divider />
          <h2 className="font-bold text-xl mb-2">Indexed Files</h2>
          <SingleUseConnectorsTable<FileConfig, {}>
            connectorIndexingStatuses={fileIndexingStatuses}
            specialColumns={[
              {
                header: "File Names",
                key: "file_names",
                getValue: (ccPairStatus) =>
                  ccPairStatus.connector.connector_specific_config.file_locations
                    .map(getNameFromPath)
                    .join(", "),
              },
            ]}
            onUpdate={() =>
              mutate("/api/manage/admin/connector/indexing-status")
            }
          />
        </div>
      )}
    </div>
  );
};

export default function File() {
  return (
    <div className="mx-auto container">
      <div>
        <HealthCheckBanner />
      </div>
      <BackButton />

      <AdminPageTitle icon={<FileIcon size={32} />} title="File" />

      <Main />
    </div>
  );
}
