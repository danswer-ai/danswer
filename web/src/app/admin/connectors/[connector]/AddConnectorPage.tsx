"use client";

import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { AdminPageTitle } from "@/components/admin/Title";
import { buildSimilarCredentialInfoURL } from "@/app/admin/connector/[ccPairId]/lib";
import { useFormContext } from "@/context/FormContext";
import { getSourceDisplayName } from "@/lib/sources";
import { SourceIcon } from "@/components/SourceIcon";
import { useState } from "react";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { submitFiles } from "./pages/utils/files";
import { submitGoogleSite } from "./pages/utils/google_site";
import AdvancedFormPage from "./pages/Advanced";
import DynamicConnectionForm from "./pages/DynamicConnectorCreationForm";
import CreateCredential from "@/components/credentials/actions/CreateCredential";
import ModifyCredential from "@/components/credentials/actions/ModifyCredential";
import { ConfigurableSources, ValidSources } from "@/lib/types";
import { Credential, credentialTemplates } from "@/lib/connectors/credentials";
import {
  ConnectionConfiguration,
  connectorConfigs,
  createConnectorInitialValues,
  createConnectorValidationSchema,
  defaultPruneFreqDays,
  defaultRefreshFreqMinutes,
  isLoadState,
} from "@/lib/connectors/connectors";
import GDriveMain from "./pages/gdrive/GoogleDrivePage";
import { GmailMain } from "./pages/gmail/GmailPage";
import {
  useGmailCredentials,
  useGoogleDriveCredentials,
} from "./pages/utils/hooks";
import { Formik } from "formik";
import { AccessTypeForm } from "@/components/admin/connectors/AccessTypeForm";
import { AccessTypeGroupSelector } from "@/components/admin/connectors/AccessTypeGroupSelector";
import NavigationRow from "./NavigationRow";

export interface AdvancedConfig {
  refreshFreq: number;
  pruneFreq: number;
  indexingStart: string;
}
import { Connector, ConnectorBase } from "@/lib/connectors/connectors";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import Stepper from "./Stepper";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "@/components/CustomModal";

const BASE_CONNECTOR_URL = "/api/manage/admin/connector";

export async function submitConnector<T>(
  connector: ConnectorBase<T>,
  connectorId?: number,
  fakeCredential?: boolean,
  isPublicCcpair?: boolean // exclusively for mock credentials, when also need to specify ccpair details
): Promise<{ message: string; isSuccess: boolean; response?: Connector<T> }> {
  const isUpdate = connectorId !== undefined;
  if (!connector.connector_specific_config) {
    connector.connector_specific_config = {} as T;
  }

  try {
    if (fakeCredential) {
      const response = await fetch(
        "/api/manage/admin/connector-with-mock-credential",
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...connector, is_public: isPublicCcpair }),
        }
      );
      if (response.ok) {
        const responseJson = await response.json();
        return { message: "Success!", isSuccess: true, response: responseJson };
      } else {
        const errorData = await response.json();
        return { message: `Error: ${errorData.detail}`, isSuccess: false };
      }
    } else {
      const response = await fetch(
        BASE_CONNECTOR_URL + (isUpdate ? `/${connectorId}` : ""),
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(connector),
        }
      );

      if (response.ok) {
        const responseJson = await response.json();
        return { message: "Success!", isSuccess: true, response: responseJson };
      } else {
        const errorData = await response.json();
        return { message: `Error: ${errorData.detail}`, isSuccess: false };
      }
    }
  } catch (error) {
    return { message: `Error: ${error}`, isSuccess: false };
  }
}

export default function AddConnector({
  connector,
  teamspaceId,
}: {
  connector: ConfigurableSources;
  teamspaceId?: string | string[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  // State for managing credentials and files
  const [currentCredential, setCurrentCredential] =
    useState<Credential<any> | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [createConnectorToggle, setCreateConnectorToggle] = useState(false);

  // Fetch credentials data
  const { data: credentials } = useSWR<Credential<any>[]>(
    buildSimilarCredentialInfoURL(connector),
    errorHandlingFetcher,
    { refreshInterval: 5000 }
  );

  const { data: editableCredentials } = useSWR<Credential<any>[]>(
    buildSimilarCredentialInfoURL(connector, true),
    errorHandlingFetcher,
    { refreshInterval: 5000 }
  );

  // Get credential template and configuration
  const credentialTemplate = credentialTemplates[connector];
  const configuration: ConnectionConfiguration = connectorConfigs[connector];

  // Form context and popup management
  const { setFormStep, setAlowCreate, formStep, nextFormStep, prevFormStep } =
    useFormContext();

  // Hooks for Google Drive and Gmail credentials
  const { liveGDriveCredential } = useGoogleDriveCredentials();
  const { liveGmailCredential } = useGmailCredentials();

  // Check if credential is activated
  const credentialActivated =
    (connector === "google_drive" && liveGDriveCredential) ||
    (connector === "gmail" && liveGmailCredential) ||
    currentCredential;

  // Check if there are no credentials
  const noCredentials = credentialTemplate == null;

  if (noCredentials && 1 != formStep) {
    setFormStep(Math.max(1, formStep));
  }

  if (!noCredentials && !credentialActivated && formStep != 0) {
    setFormStep(Math.min(formStep, 0));
  }

  const convertStringToDateTime = (indexingStart: string | null) => {
    return indexingStart ? new Date(indexingStart) : null;
  };

  const displayName = getSourceDisplayName(connector) || connector;
  if (!credentials || !editableCredentials) {
    return <></>;
  }

  // Credential handler functions
  const refresh = () => {
    mutate(buildSimilarCredentialInfoURL(connector));
  };

  const onDeleteCredential = async (credential: Credential<any | null>) => {
    const response = await deleteCredential(credential.id, true);
    if (response.ok) {
      toast({
        title: "Deletion Successful",
        description: "Credential deleted successfully!",
        variant: "success",
      });
    } else {
      const errorData = await response.json();
      toast({
        title: "Deletion Failed",
        description: errorData.message,
        variant: "destructive",
      });
    }
  };

  const onSwap = async (selectedCredential: Credential<any>) => {
    setCurrentCredential(selectedCredential);
    setAlowCreate(true);
    toast({
      title: "Swap Successful",
      description: "Swapped credential successfully!",
      variant: "success",
    });
    refresh();
  };

  const onSuccess = () => {
    toast({
      title: "Data Source Created",
      description: "Redirecting to Add Data Source page",
      variant: "success",
    });
    setTimeout(() => {
      window.open(
        teamspaceId
          ? `/t/${teamspaceId}/admin/data-sources`
          : "/admin/data-sources",
        "_self"
      );
    }, 1000);
  };

  return (
    <Formik
      initialValues={createConnectorInitialValues(connector)}
      validationSchema={createConnectorValidationSchema(connector)}
      onSubmit={async (values) => {
        const {
          name,
          groups,
          access_type,
          pruneFreq,
          indexingStart,
          refreshFreq,
          auto_sync_options,
          ...connector_specific_config
        } = values;

        // Apply transforms from connectors.ts configuration
        const transformedConnectorSpecificConfig = Object.entries(
          connector_specific_config
        ).reduce(
          (acc, [key, value]) => {
            const matchingConfigValue = configuration.values.find(
              (configValue) => configValue.name === key
            );
            if (
              matchingConfigValue &&
              "transform" in matchingConfigValue &&
              matchingConfigValue.transform
            ) {
              acc[key] = matchingConfigValue.transform(value as string[]);
            } else {
              acc[key] = value;
            }
            return acc;
          },
          {} as Record<string, any>
        );

        // Apply advanced configuration-specific transforms.
        const advancedConfiguration: any = {
          pruneFreq: (pruneFreq || defaultPruneFreqDays) * 60 * 60 * 24,
          indexingStart: convertStringToDateTime(indexingStart),
          refreshFreq: (refreshFreq || defaultRefreshFreqMinutes) * 60,
        };

        // Google sites-specific handling
        if (connector == "google_sites") {
          const response = await submitGoogleSite(
            selectedFiles,
            values?.base_url,
            advancedConfiguration.refreshFreq,
            advancedConfiguration.pruneFreq,
            advancedConfiguration.indexingStart,
            values.access_type == "public",
            name
          );
          if (response) {
            toast({
              title: "Google Site Submitted",
              description: "Your Google site has been successfully submitted!",
              variant: "success",
            });
            onSuccess();
          } else {
            toast({
              title: "Error",
              description: response,
              variant: "destructive",
            });
          }
          return;
        }

        // File-specific handling
        if (connector == "file" && selectedFiles.length > 0) {
          const response = await submitFiles(
            selectedFiles,
            setSelectedFiles,
            name,
            access_type == "public",
            groups
          );
          console.log(response);
          if (response) {
            onSuccess();
            toast({
              title: "Success",
              description: "Successfully uploaded files!",
              variant: "success",
            });
          } else {
            toast({
              title: "Error",
              description: response,
              variant: "destructive",
            });
          }
          return;
        }

        const { message, isSuccess, response } = await submitConnector<any>(
          {
            connector_specific_config: transformedConnectorSpecificConfig,
            input_type: isLoadState(connector) ? "load_state" : "poll", // single case
            name: name,
            source: connector,
            is_public: access_type == "public",
            refresh_freq: advancedConfiguration.refreshFreq || null,
            prune_freq: advancedConfiguration.pruneFreq || null,
            indexing_start: advancedConfiguration.indexingStart || null,
            groups: groups,
          },
          undefined,
          credentialActivated ? false : true,
          access_type == "public"
        );
        // If no credential
        if (!credentialActivated) {
          if (isSuccess) {
            onSuccess();
          } else {
            toast({
              title: "Error",
              description: message,
              variant: "destructive",
            });
          }
        }

        // Without credential
        if (credentialActivated && isSuccess && response) {
          const credential =
            currentCredential || liveGDriveCredential || liveGmailCredential;
          const linkCredentialResponse = await linkCredential(
            response.id,
            credential?.id!,
            name,
            access_type,
            groups,
            auto_sync_options
          );
          if (linkCredentialResponse.ok) {
            onSuccess();
          } else {
            const errorData = await linkCredentialResponse.json();
            toast({
              title: "Error",
              description: errorData.message,
              variant: "destructive",
            });
          }
        } else if (isSuccess) {
          onSuccess();
        } else {
          toast({
            title: "Error",
            description: message,
            variant: "destructive",
          });
        }
        return;
      }}
    >
      {(formikProps) => {
        return (
          <div className="w-full mx-auto pb-0">
            <div className="mb-4">
              <HealthCheckBanner />
            </div>
            <Button
              onClick={() =>
                router.push(
                  teamspaceId
                    ? `/t/${teamspaceId}/admin/data-sources`
                    : "/admin/data-sources"
                )
              }
              variant="ghost"
              className="mb-5"
            >
              <ChevronLeft className="my-auto mr-1" size={16} />
              Back
            </Button>

            <AdminPageTitle
              icon={<SourceIcon iconSize={32} sourceType={connector} />}
              title={displayName}
            />

            <Stepper />

            <div className="h-full overflow-y-auto">
              {formStep == 0 && (
                <Card>
                  <CardContent>
                    <h3 className="mb-2">Select a credential</h3>
                    {connector == "google_drive" ? (
                      <GDriveMain />
                    ) : connector == "gmail" ? (
                      <GmailMain />
                    ) : (
                      <>
                        <ModifyCredential
                          showIfEmpty
                          source={connector}
                          defaultedCredential={currentCredential!}
                          credentials={credentials}
                          editableCredentials={editableCredentials}
                          onDeleteCredential={onDeleteCredential}
                          onSwitch={onSwap}
                        />
                        {!createConnectorToggle && (
                          <Button
                            className="mt-6"
                            onClick={() =>
                              setCreateConnectorToggle(
                                (createConnectorToggle) =>
                                  !createConnectorToggle
                              )
                            }
                          >
                            Create New
                          </Button>
                        )}

                        {/* NOTE: connector will never be google_drive, since the ternary above will 
    prevent that, but still keeping this here for safety in case the above changes. */}
                        {(connector as ValidSources) !== "google_drive" &&
                          createConnectorToggle && (
                            <CustomModal
                              onClose={() => setCreateConnectorToggle(false)}
                              title={`Create a ${getSourceDisplayName(connector)} credential`}
                              trigger={null}
                              open={
                                (connector as ValidSources) !==
                                  "google_drive" && createConnectorToggle
                              }
                            >
                              <>
                                <h3 className="mb-2">
                                  Create a {getSourceDisplayName(connector)}{" "}
                                  credential
                                </h3>
                                <CreateCredential
                                  close
                                  refresh={refresh}
                                  sourceType={connector}
                                  onSwitch={onSwap}
                                  onClose={() =>
                                    setCreateConnectorToggle(false)
                                  }
                                />
                              </>
                            </CustomModal>
                          )}
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {formStep == 1 && (
                <Card>
                  <CardContent>
                    <DynamicConnectionForm
                      values={formikProps.values}
                      config={configuration}
                      setSelectedFiles={setSelectedFiles}
                      selectedFiles={selectedFiles}
                    />
                    <AccessTypeForm connector={connector} />
                    <AccessTypeGroupSelector />
                  </CardContent>
                </Card>
              )}

              {formStep === 2 && (
                <Card>
                  <CardContent>
                    <AdvancedFormPage />
                  </CardContent>
                </Card>
              )}

              <NavigationRow
                activatedCredential={credentialActivated != null}
                isValid={formikProps.isValid}
                onSubmit={formikProps.handleSubmit}
                noCredentials={noCredentials}
                noAdvanced={connector == "file"}
              />
            </div>
          </div>
        );
      }}
    </Formik>
  );
}
