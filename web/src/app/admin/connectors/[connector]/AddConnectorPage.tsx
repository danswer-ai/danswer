"use client";

import { TrashIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";
import { HealthCheckBanner } from "@/components/health/healthcheck";

import { Card, Title } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import { buildSimilarCredentialInfoURL } from "@/app/admin/connector/[ccPairId]/lib";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useFormContext } from "@/components/context/FormContext";
import { getSourceDisplayName } from "@/lib/sources";
import { SourceIcon } from "@/components/SourceIcon";
import { useState } from "react";
import { submitConnector } from "@/components/admin/connectors/ConnectorForm";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { submitFiles } from "./pages/utils/files";
import { submitGoogleSite } from "./pages/utils/google_site";
import AdvancedFormPage from "./pages/Advanced";
import DynamicConnectionForm from "./pages/Create";
import CreateCredential from "@/components/credentials/CreateCredential";
import ModifyCredential from "@/components/credentials/ModifyCredential";
import { ValidSources } from "@/lib/types";
import { Credential, credentialTemplates } from "@/lib/connectors/credentials";
import {
  ConnectionConfiguration,
  connectorConfigs,
} from "@/lib/connectors/connectors";
import { Modal } from "@/components/Modal";
import { ArrowRight } from "@phosphor-icons/react";
import { ArrowLeft } from "@phosphor-icons/react/dist/ssr";
import { FiPlus } from "react-icons/fi";
import GDriveMain from "./pages/gdrive/GoogleDrivePage";
import { GmailMain } from "./pages/gmail/GmailPage";
import {
  useGmailCredentials,
  useGoogleDriveCredentials,
} from "./pages/utils/hooks";

export type AdvancedConfig = {
  pruneFreq: number | null;
  refreshFreq: number | null;
  indexingStart: Date | null;
};

export default function AddConnector({
  connector,
}: {
  connector: ValidSources;
}) {
  const [name, setName] = useState("");
  const [currentCredential, setCurrentCredential] =
    useState<Credential<any> | null>(null);

  const { data: credentials } = useSWR<Credential<any>[]>(
    buildSimilarCredentialInfoURL(connector),
    errorHandlingFetcher,
    { refreshInterval: 5000 }
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const credentialTemplate = credentialTemplates[connector];

  const { setFormStep, formStep, nextFormStep, prevFormStep } =
    useFormContext();

  const { popup, setPopup } = usePopup();

  const configuration: ConnectionConfiguration = connectorConfigs[connector];

  const initialValues = configuration.values.reduce(
    (acc, field) => {
      if (field.type === "list") {
        acc[field.name] = field.default || [];
      } else if (field.default !== undefined) {
        acc[field.name] = field.default;
      }
      return acc;
    },
    {} as { [record: string]: any }
  );

  const [values, setValues] = useState<{ [record: string]: any } | null>(
    Object.keys(initialValues).length > 0 ? initialValues : null
  );

  // Default to 10 minutes unless otherwise specified
  const defaultRefresh = configuration.overrideDefaultFreq || 10 * 60;
  const [refreshFreq, setRefreshFreq] = useState<number>(defaultRefresh || 0);
  const [pruneFreq, setPruneFreq] = useState<number>(0);
  const [indexingStart, setIndexingStart] = useState<Date | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [createConnectorToggle, setCreateConnectorToggle] = useState(false);

  const [isFormValid, setIsFormValid] = useState(false);

  const handleFormStatusChange = (isValid: boolean) => {
    setIsFormValid(isValid || connector == "file");
  };

  const { liveGDriveCredential } = useGoogleDriveCredentials(
    connector == "google_drive"
  );

  const { liveGmailCredential } = useGmailCredentials(connector == "gmail");

  const credentialActivated =
    liveGDriveCredential || liveGmailCredential || currentCredential;

  const noCredentials = credentialTemplate == null;
  if (noCredentials) {
    setFormStep(Math.max(1, formStep));
  } else if (!credentialActivated) {
    setFormStep(Math.min(formStep, 0));
  }
  const createConnector = async () => {
    const AdvancedConfig: AdvancedConfig = {
      pruneFreq: pruneFreq || defaultRefresh,
      indexingStart,
      refreshFreq,
    };

    // google sites-specific handling
    if (connector == "google_site") {
      const response = await submitGoogleSite(
        selectedFiles,
        values?.base_url,
        setPopup,
        AdvancedConfig,
        name
      );
      if (response) {
        setTimeout(() => {
          window.open("/admin/indexing/status", "_self");
        }, 1000);
      } else {
        console.log("No repsonse");
      }
      return;
    }

    // file-specific handling
    if (connector == "file" && selectedFiles.length > 0) {
      const response = await submitFiles(
        selectedFiles,
        setPopup,
        setSelectedFiles,
        name,
        AdvancedConfig,
        isPublic
      );
      if (response) {
        setTimeout(() => {
          window.open("/admin/indexing/status", "_self");
        }, 1000);
      }
      return;
    }

    const { message, isSuccess, response } = await submitConnector<any>(
      {
        connector_specific_config: values,
        input_type: "poll",
        name: name,
        source: connector,
        refresh_freq: refreshFreq || defaultRefresh,
        prune_freq: pruneFreq || null,
        indexing_start: indexingStart,
        disabled: false,
      },
      undefined,
      credentialActivated ? false : true
    );

    // If no credential
    if (!credentialActivated) {
      if (isSuccess) {
        setPopup({
          message: "Connector created! Redirecting to connector home page",
          type: "success",
        });
        setTimeout(() => {
          window.open("/admin/indexing/status", "_self");
        }, 1000);
      } else {
        setPopup({ message: message, type: "error" });
      }
    }

    // Without credential
    if (isSuccess && response && credentialActivated) {
      const credential =
        currentCredential || liveGDriveCredential || liveGmailCredential;
      const linkCredentialResponse = await linkCredential(
        response.id,
        credential?.id!,
        name,
        isPublic
      );
      if (linkCredentialResponse.ok) {
        setPopup({
          message: "Connector created! Redirecting to connector home page",
          type: "success",
        });
        setTimeout(() => {
          window.open("/admin/indexing/status", "_self");
        }, 1000);
      }
    } else {
      setPopup({ message: message, type: "error" });
    }
  };

  const displayName = getSourceDisplayName(connector) || connector;
  if (!credentials) {
    return <></>;
  }

  const refresh = () => {
    mutate(buildSimilarCredentialInfoURL(connector));
  };
  const onDeleteCredential = async (credential: Credential<any | null>) => {
    const response = await deleteCredential(credential.id, true);
    console.log(response);
    if (response.ok) {
      setPopup({
        message: "Credential deleted successfully!",
        type: "success",
      });
    } else {
      const errorData = await response.json();
      setPopup({
        message: errorData.message,
        type: "error",
      });
    }
  };

  const onSwap = async (selectedCredential: Credential<any>) => {
    setCurrentCredential(selectedCredential);
    setPopup({
      message: "Swapped credential successfully!",
      type: "success",
    });
    refresh();
  };

  const updateValues = (field: string, value: any) => {
    if (field == "name") {
      return;
    }
    setValues((values) => {
      if (!values) {
        return { [field]: value };
      } else {
        return { ...values, [field]: value };
      }
    });
  };

  return (
    <div className="mx-auto mb-8 w-full">
      {popup}
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <AdminPageTitle
        includeDivider={false}
        icon={<SourceIcon iconSize={32} sourceType={connector} />}
        title={displayName}
      />

      {formStep == 0 &&
        (connector == "google_drive" ? (
          <>
            <Card>
              <Title className="mb-2 text-lg">Select a credential</Title>
              <GDriveMain />
            </Card>
            <div className="mt-4 flex w-full justify-end">
              <button
                className="enabled:cursor-pointer disabled:bg-blue-200 bg-blue-400 flex gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
                disabled={!credentialActivated}
                onClick={() => nextFormStep()}
              >
                Continue
                <ArrowRight />
              </button>
            </div>
          </>
        ) : connector == "gmail" ? (
          <>
            <Card>
              <Title className="mb-2 text-lg">Select a credential</Title>

              <GmailMain />
            </Card>
            <div className="mt-4 flex w-full justify-end">
              <button
                className="enabled:cursor-pointer disabled:bg-blue-200 bg-blue-400 flex gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
                disabled={!credentialActivated}
                onClick={() => nextFormStep()}
              >
                Continue
                <ArrowRight />
              </button>
            </div>
          </>
        ) : (
          <>
            <Card>
              <Title className="mb-2 text-lg">Select a credential</Title>
              <ModifyCredential
                showIfEmpty
                display
                source={connector}
                defaultedCredential={currentCredential!}
                credentials={credentials}
                setPopup={setPopup}
                onDeleteCredential={onDeleteCredential}
                onSwitch={onSwap}
              />
              {!createConnectorToggle && (
                <div className="mt-8 w-full flex gap-x-2 items-center">
                  <div className="w-full h-[1px] bg-background-300" />
                  <button
                    className="text-sm bg-background-900 px-2 py-1.5 flex text-text-200 flex-none rounded"
                    onClick={() =>
                      setCreateConnectorToggle(
                        (createConnectorToggle) => !createConnectorToggle
                      )
                    }
                  >
                    Create New
                  </button>
                  {/* <p className="text-sm flex-none">or create</p> */}
                  <div className="w-full h-[1px] bg-background-300" />
                </div>
              )}

              {!(connector == "google_drive") && createConnectorToggle && (
                <Modal
                  className="max-w-3xl rounded-lg"
                  onOutsideClick={() => setCreateConnectorToggle(false)}
                >
                  <>
                    {/* < */}
                    <Title className="mb-2 text-lg">
                      Create a {getSourceDisplayName(connector)} credential
                    </Title>
                    <CreateCredential
                      close
                      onSwitch={onSwap}
                      refresh={refresh}
                      onClose={() => setCreateConnectorToggle(false)}
                      sourceType={connector}
                      setPopup={setPopup}
                    />
                  </>
                </Modal>
              )}
            </Card>
            <div className="mt-4 flex w-full justify-end">
              <button
                className="enabled:cursor-pointer disabled:cursor-not-allowed disabled:bg-blue-200 bg-blue-400 flex gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
                disabled={currentCredential == null}
                onClick={() => nextFormStep()}
              >
                Continue
                <ArrowRight />
              </button>
            </div>
          </>
        ))}

      {formStep == 1 && (
        <>
          <Card>
            <DynamicConnectionForm
              setSelectedFiles={setSelectedFiles}
              selectedFiles={selectedFiles}
              setIsPublic={setIsPublic}
              updateValues={updateValues}
              setName={setName}
              config={configuration}
              isPublic={isPublic}
              defaultValues={values}
              initialName={name}
              onFormStatusChange={handleFormStatusChange}
            />
          </Card>
          <div className={`mt-4 w-full grid grid-cols-3`}>
            {!noCredentials ? (
              <button
                className="border-border-dark mr-auto border flex gap-x-1 items-center text-text p-2.5 text-sm font-regular rounded-sm "
                onClick={() => prevFormStep()}
              >
                <ArrowLeft />
                Previous
              </button>
            ) : (
              <div />
            )}
            <button
              className="enabled:cursor-pointer ml-auto disabled:bg-accent/50 disabled:cursor-not-allowed bg-accent flex mx-auto gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
              disabled={!isFormValid}
              onClick={async () => {
                await createConnector();
              }}
            >
              Create Connector
              <FiPlus className="text-white h-4 w-4" />
            </button>

            <div className="flex w-full justify-end">
              <button
                className={`enabled:cursor-pointer enabled:hover:underline disabled:cursor-not-allowed mt-auto enabled:text-text-600 disabled:text-text-400 ml-auto flex gap-x-1 items-center py-2.5 px-3.5 text-sm font-regular rounded-sm`}
                disabled={!isFormValid}
                onClick={() => {
                  nextFormStep();
                }}
              >
                Advanced
                <ArrowRight />
              </button>
            </div>
          </div>
        </>
      )}

      {formStep === 2 && (
        <>
          <Card>
            <AdvancedFormPage
              setIndexingStart={setIndexingStart}
              indexingStart={indexingStart}
              currentPruneFreq={pruneFreq}
              currentRefreshFreq={refreshFreq}
              setPruneFreq={setPruneFreq}
              setRefreshFreq={setRefreshFreq}
            />
            <div className="mt-4 flex w-full mx-auto max-w-2xl justify-start">
              <button
                className="flex gap-x-1 bg-red-500 hover:bg-red-500/80 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded "
                disabled={currentCredential == null}
                onClick={() => prevFormStep()}
              >
                <TrashIcon size={20} className="text-white" />
                <div className="w-full items-center gap-x-2 flex">Reset</div>
              </button>
            </div>
          </Card>
          <div className={`mt-4 grid grid-cols-3 w-full `}>
            <button
              className="border-border-dark border mr-auto flex gap-x-1 items-center text-text py-2.5 px-3.5 text-sm font-regular rounded-sm"
              onClick={() => prevFormStep()}
            >
              <ArrowLeft />
              Previous
            </button>
            <button
              className="enabled:cursor-pointer ml-auto disabled:bg-accent/50 bg-accent flex mx-auto gap-x-1 items-center text-white py-2.5 px-3.5 text-sm font-regular rounded-sm"
              onClick={async () => {
                await createConnector();
              }}
            >
              Create Connector
              <FiPlus className="text-white h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
