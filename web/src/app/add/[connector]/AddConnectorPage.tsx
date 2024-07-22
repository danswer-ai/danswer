"use client";

import { SettingsIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate } from "swr";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  ConfluenceCredentialJson,
  Credential,
  ValidSources,
  getComprehensiveConnectorConfigTemplate,
} from "@/lib/types";
import { Button, Card, Title } from "@tremor/react";
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

export type advancedConfig = {
  pruneFreq: number;
  refreshFreq: number;
};

export default function AddConnector({
  connector,
}: {
  connector: ValidSources;
}) {
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

  const [advancedConfig, setAdvancedConfig] = useState<advancedConfig | null>(
    null
  );

  const createCredential = () => {};
  const displayName = getSourceDisplayName(connector) || connector;
  if (!credentials) {
    return <></>;
  }

  const refresh = () => {
    mutate(buildSimilarCredentialInfoURL(connector));
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
            {credentials.length == 0 ? (
              <div className="mt-4">
                <p>
                  No credentials exist! Create your first {displayName}{" "}
                  credential!
                </p>
                <CreateCredential sourceType={connector} setPopup={setPopup} />
              </div>
            ) : (
              <CreateConnectorCredentialSection
                credentials={credentials}
                refresh={() => refresh()}
                updateCredential={setCurrentCredential}
                currentCredential={currentCredential}
                sourceType={connector}
              />
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
              config={configuration}
              onSubmit={(values: any) => {
                setValues(values);
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
            <Button color="gray" onClick={() => createCredential()}>
              Create
            </Button>
          </div>
        </>
      )}

      {formStep === 2 && (
        <Card>
          <AdvancedFormPage
            setAdvancedConfig={setAdvancedConfig}
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
