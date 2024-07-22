"use client";

import { SettingsIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  ConfluenceCredentialJson,
  Connector,
  Credential,
  ValidSources,
  getComprehensiveConnectorConfigTemplate,
  isValidSource,
} from "@/lib/types";
import { Button, Card, Divider, Title } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import FixedLogo from "@/app/chat/shared_chat_search/FixedLogo";
import { buildSimilarCredentialInfoURL } from "@/app/admin/connector/[ccPairId]/lib";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useFormContext } from "@/components/context/FormContext";
import { getSourceDisplayName } from "@/lib/sources";
import DynamicConnectionForm from "./shared/CreateConnector";
import { ConnectionConfiguration } from "./shared/types";
import AdvancedFormPage from "./shared/AdvancedFormPage";
import { SourceIcon } from "@/components/SourceIcon";
import CreateCredential from "@/components/credentials/CreateCredential";
import { useState } from "react";
import CreateConnectorCredentialSection from "./shared/CreatingConnectorCredentialPage";
import { FiChevronLeft } from "react-icons/fi";
import { submitConnector } from "@/components/admin/connectors/ConnectorForm";
import {
  deleteCredential,
  linkCredential,
  updateCredential,
} from "@/lib/credential";
import { redirect } from "next/navigation";
import { HeaderTitle } from "@/components/header/Header";
import ModifyCredential from "@/components/credentials/ModifyCredential";

export type advancedConfig = {
  pruneFreq: number;
  refreshFreq: number;
};

export default function AddConnector({
  connector,
}: {
  connector: ValidSources;
}) {
  const [name, setName] = useState("");
  const [currentCredential, setCurrentCredential] =
    useState<Credential<any> | null>(null);

  const { data: credentials } = useSWR<Credential<ConfluenceCredentialJson>[]>(
    buildSimilarCredentialInfoURL(connector),
    errorHandlingFetcher,
    { refreshInterval: 5000 }
  );
  const { setFormStep, formStep, nextFormStep, prevFormStep } =
    useFormContext();

  const { popup, setPopup } = usePopup();

  const configuration: ConnectionConfiguration =
    getComprehensiveConnectorConfigTemplate(connector);

  const [values, setValues] = useState(null);

  if (!currentCredential) {
    setFormStep(Math.min(formStep, 0));
  }

  const [refreshFreq, setRefreshFreq] = useState<number>(0);
  const [pruneFreq, setPruneFreq] = useState<number>(0);
  const [isPublic, setIsPublic] = useState(false);

  const createConnector = async () => {
    if (!currentCredential) {
      return;
    }

    const { message, isSuccess, response } = await submitConnector<any>({
      connector_specific_config: values,
      input_type: "load_state",
      name: name,
      source: connector,
      refresh_freq: refreshFreq || 0,
      prune_freq: pruneFreq ?? null,
      disabled: false,
    });

    console.log({
      connector_specific_config: values,
      input_type: "load_state",
      name: name,
      source: connector,
      refresh_freq: refreshFreq || 0,
      prune_freq: pruneFreq ?? null,
      disabled: false,
    });
    console.log(response?.id, currentCredential.id, "random name", isPublic);

    if (isSuccess && response) {
      const linkCredentialResponse = await linkCredential(
        response.id,
        currentCredential.id,
        "random name",
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
  if (!isValidSource(connector)) {
    return (
      <div className="mx-auto flex flex-col gap-y-2">
        <HeaderTitle>
          <p>'{connector}' is not a valid Connector Type!</p>
        </HeaderTitle>
        <Button
          onClick={() => window.open("/admin/indexing/status", "_self")}
          className="mr-auto"
        >
          {" "}
          Go home{" "}
        </Button>
        <FixedLogo />
      </div>
    );
  }
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
    // setShowModifyCredential(false);
    refresh();
  };

  return (
    <div className="mx-auto w-full">
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
            <Title className="mb-2">Select a credential</Title>
            {currentCredential ? (
              <CreateConnectorCredentialSection
                credentials={credentials}
                refresh={() => refresh()}
                updateCredential={setCurrentCredential}
                currentCredential={currentCredential}
                sourceType={connector}
              />
            ) : credentials.length == 0 ? (
              <div className="mt-4">
                <p>
                  No credentials exist! Create your first {displayName}{" "}
                  credential!
                </p>
                <CreateCredential
                  refresh={refresh}
                  sourceType={connector}
                  setPopup={setPopup}
                />
              </div>
            ) : (
              <>
                <ModifyCredential
                  display
                  source={connector}
                  defaultedCredential={currentCredential!}
                  credentials={credentials}
                  setPopup={setPopup}
                  onDeleteCredential={onDeleteCredential}
                  onSwitch={onSwap}
                />
                <div className="my-8 w-full flex gap-x-2 items-center">
                  <div className="w-full h-[2px] bg-neutral-300" />
                  <p className="text-sm flex-none">or create</p>
                  <div className="w-full h-[2px] bg-neutral-300" />
                </div>
                <Title className="mb-2">Create a credential</Title>

                <CreateCredential
                  refresh={refresh}
                  sourceType={connector}
                  setPopup={setPopup}
                />
              </>
            )}
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
              setName={setName}
              config={configuration}
              onSubmit={(values: any) => {
                const { name: _, public: __, ...valuesWithoutName } = values;
                console.log(valuesWithoutName);
                setValues(valuesWithoutName);
              }}
              onClose={() => null}
              defaultValues={values}
            />
            <div className="flex w-full">
              <Button
                color="zinc"
                onClick={() => nextFormStep()}
                className="flex gap-x-2 ml-auto"
              >
                <SettingsIcon className=" h-3 w-3" />
              </Button>
            </div>
          </Card>
          <div className="mt-4 flex w-full justify-between">
            <button
              className="px-2 hover:bg-accent/80 transition-color duration-300 rounded-lg bg-accent"
              onClick={() => prevFormStep()}
            >
              <FiChevronLeft className="text-neutral-200 h-6 w-6" />
            </button>
            <Button color="gray" onClick={() => createConnector()}>
              Create
            </Button>
          </div>
        </>
      )}

      {formStep === 2 && (
        <Card>
          <AdvancedFormPage
            currentPruneFreq={pruneFreq}
            currentRefreshFreq={refreshFreq}
            setPruneFreq={setPruneFreq}
            setRefreshFreq={setRefreshFreq}
            onClose={() => null}
            onSubmit={() => null}
          />
          <div className="mt-4 flex w-full mx-auto max-w-2xl justify-between">
            <Button
              color="violet"
              onClick={() => prevFormStep()}
              className="flex gap-x-2"
            >
              <div className="w-full items-center gap-x-2 flex">Quit?</div>
            </Button>
            <Button onClick={() => prevFormStep()}>Update</Button>
          </div>
        </Card>
      )}

      <FixedLogo />
    </div>
  );
}
