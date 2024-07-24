"use client";

import { PlusCircleIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  Credential,
  ValidSources,
  getConnectorConfig,
  getCredentialTemplate,
  longRefresh,
} from "@/lib/types";
import { Button, Card, Title } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import { buildSimilarCredentialInfoURL } from "@/app/admin/connector/[ccPairId]/lib";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useFormContext } from "@/components/context/FormContext";
import { getSourceDisplayName } from "@/lib/sources";
import { ConnectionConfiguration } from "./types";
import { SourceIcon } from "@/components/SourceIcon";
import { useState } from "react";
import { submitConnector } from "@/components/admin/connectors/ConnectorForm";
import { deleteCredential, linkCredential } from "@/lib/credential";
import { submitFiles } from "./pages/handlers/files";
import { submitGoogleSite } from "./pages/handlers/google_site";
import AdvancedFormPage from "./pages/AdvancedFormPage";
import DynamicConnectionForm from "./pages/CreateConnector";
import CreateCredential from "@/components/credentials/CreateCredential";
import ModifyCredential from "@/components/credentials/ModifyCredential";

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

  const credentialTemplate = getCredentialTemplate(connector);

  const { setFormStep, formStep, nextFormStep, prevFormStep } =
    useFormContext();

  const { popup, setPopup } = usePopup();

  const configuration: ConnectionConfiguration = getConnectorConfig(connector);

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
  console.log(values);

  const noCredentials =
    credentialTemplate === "file" ||
    credentialTemplate == "sites" ||
    credentialTemplate == "web" ||
    credentialTemplate == "wiki";

  if (noCredentials) {
    setFormStep(Math.max(1, formStep));
  } else if (!currentCredential) {
    setFormStep(Math.min(formStep, 0));
  }

  const defaultRefresh = longRefresh.includes(connector)
    ? 60 * 60 * 24
    : 10 * 60;

  const [refreshFreq, setRefreshFreq] = useState<number>(defaultRefresh || 0);
  const [pruneFreq, setPruneFreq] = useState<number>(0);
  const [indexingStart, setIndexingStart] = useState<Date | null>(null);
  const [isPublic, setIsPublic] = useState(false);

  const resetAdvancedSettings = () => {
    setPruneFreq(0);
    setRefreshFreq(defaultRefresh);
    setIndexingStart(null);
    prevFormStep();
  };

  const createConnector = async () => {
    const AdvancedConfig: AdvancedConfig = {
      pruneFreq: pruneFreq || defaultRefresh,
      indexingStart,
      refreshFreq,
    };
    if (credentialTemplate === "sites") {
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

    if (credentialTemplate == "file" && selectedFiles.length > 0) {
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

    if (!currentCredential && credentialTemplate === "file") {
      return;
    }

    if (!currentCredential && credentialTemplate != "wiki") {
      return;
    }
    if (!currentCredential) {
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
        true
      );
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
      return;
    }

    const { message, isSuccess, response } = await submitConnector<any>({
      connector_specific_config: values,
      input_type: "poll",
      name: name,
      source: connector,
      refresh_freq: refreshFreq || defaultRefresh,
      prune_freq: pruneFreq || null,
      indexing_start: indexingStart,
      disabled: false,
    });

    if (isSuccess && response && currentCredential) {
      const linkCredentialResponse = await linkCredential(
        response.id,
        currentCredential.id,
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
    await deleteCredential(credential.id, true);
  };

  const onSwap = async (selectedCredential: Credential<any>) => {
    setCurrentCredential(selectedCredential);
    setPopup({
      message: "Swapped credential succesfully!",
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

      {formStep == 0 && (
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
            {/* {!(connector == "google_drive") && */}
            <>
              <div className="my-8 w-full flex gap-x-2 items-center">
                <div className="w-full h-[1px] bg-neutral-300" />
                <p className="text-sm flex-none">or create</p>
                <div className="w-full h-[1px] bg-neutral-300" />
              </div>
              <Title className="mb-2 text-lg">Create a credential</Title>
              <CreateCredential
                refresh={refresh}
                sourceType={connector}
                setPopup={setPopup}
              />
            </>
            {/* } */}
          </Card>
          <div className="mt-4 flex w-full justify-end">
            <Button
              disabled={currentCredential == null}
              onClick={() => nextFormStep()}
            >
              Continue
            </Button>
          </div>
        </>
      )}

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
              onSubmit={(values: any) => {
                const {
                  name: _,
                  public: isPublic,
                  ...valuesWithoutName
                } = values;
                console.log(`Setting public to ${isPublic}`);
                setValues(valuesWithoutName);
                setIsPublic(isPublic);
              }}
              defaultValues={values}
            />
          </Card>
          <div className={`mt-4 flex w-full grid grid-cols-3`}>
            {!noCredentials ? (
              <button
                className="px-2 mr-auto hover:bg-accent/80 transition-color text-white duration-300 rounded-lg bg-accent"
                onClick={() => prevFormStep()}
              >
                Previous
              </button>
            ) : (
              <div />
            )}

            <Button
              className="mt-auto mx-auto"
              type="button"
              color="gray"
              onClick={() => createConnector()}
            >
              <div className="flex items-center gap-x-2">
                Create
                <PlusCircleIcon className="text-neutral-200" />
              </div>
            </Button>

            {!noCredentials ? (
              <button
                className="ml-auto mt-auto hover:underline"
                onClick={() => nextFormStep()}
              >
                Advanced Settings
              </button>
            ) : (
              <div />
            )}
          </div>
        </>
      )}

      {formStep === 2 && (
        <Card>
          <AdvancedFormPage
            setIndexingStart={setIndexingStart}
            indexingStart={indexingStart}
            currentPruneFreq={pruneFreq}
            currentRefreshFreq={refreshFreq}
            setPruneFreq={setPruneFreq}
            setRefreshFreq={setRefreshFreq}
          />
          <div className="mt-4 flex w-full mx-auto max-w-2xl justify-between">
            <Button
              color="violet"
              onClick={() => resetAdvancedSettings()}
              className="flex gap-x-2"
            >
              <div className="w-full items-center gap-x-2 flex">Reset</div>
            </Button>
            <Button
              onClick={() => {
                console.log(indexingStart);
                prevFormStep();
              }}
            >
              Update
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
