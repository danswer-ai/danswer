"use client";

import * as Yup from "yup";
import { SlackIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { mutate, useSWRConfig } from "swr";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  ConfluenceCredentialJson,
  Connector,
  Credential,
  ValidSources,
  getComprehensiveConnectorConfigTemplate,
} from "@/lib/types";
import { Button, Card, Title } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import FixedLogo from "@/app/chat/shared_chat_search/FixedLogo";
import { CCPairFullInfo } from "@/app/admin/connector/[ccPairId]/types";
import {
  buildCCPairInfoUrl,
  buildSimilarCredentialInfoURL,
} from "@/app/admin/connector/[ccPairId]/lib";
import CredentialSection from "@/components/credentials/CredentialSection";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useRouter } from "next/navigation";
import { useFormContext } from "@/components/context/FormContext";
import { getSourceDisplayName } from "@/lib/sources";
import DynamicConnectionForm from "./shared/CreateConnector";
import { ConnectionConfiguration } from "./shared/types";
import EditCredential from "@/components/credentials/EditCredential";
import AdvancedFormPage from "./shared/AdvancedFormPage";
import { SourceIcon } from "@/components/SourceIcon";
import CreateCredential from "@/components/credentials/CreateCredential";
import { useStandardAnswerCategories } from "@/app/admin/standard-answer/hooks";
import { useState } from "react";
import CreateConnectorCredentialSection from "./shared/CreatingConnectorCredentialPage";

export default function AddConnector({
  connector,
}: {
  connector: ValidSources;
}) {
  const {
    data: ccPair,
    isLoading,
    error,
  } = useSWR<CCPairFullInfo>(
    buildCCPairInfoUrl(2),
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );

  const [currentCredential, setCurrentCredential] =
    useState<Credential<any> | null>(null);

  const { data: credentials } = useSWR<Credential<ConfluenceCredentialJson>[]>(
    buildSimilarCredentialInfoURL(connector),
    errorHandlingFetcher,
    { refreshInterval: 5000 } // 5 seconds
  );
  const { formStep, formValues, nextFormStep, prevFormStep } = useFormContext();

  const { popup, setPopup } = usePopup();

  const configuration: ConnectionConfiguration =
    getComprehensiveConnectorConfigTemplate(connector);

  const [values, setValues] = useState(null);

  const createCredential = () => {};
  const displayName = getSourceDisplayName(connector) || connector;

  if (!credentials || !ccPair) {
    return <></>;
  }

  return (
    <div className="mx-auto w-full">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <AdminPageTitle
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
                <CreateCredential
                  sourceType={connector}
                  connector={ccPair.connector}
                  setPopup={setPopup}
                />
              </div>
            ) : (
              <CreateConnectorCredentialSection
                credentials={credentials}
                ccPair={ccPair}
                refresh={() => mutate(buildSimilarCredentialInfoURL(connector))}
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
                console.log(values);
                setValues(values);
              }}
              onClose={() => null}
              defaultValues={values}
            />
            <div className="flex w-full">
              <Button onClick={() => nextFormStep()} className="ml-auto">
                Advanced?
              </Button>
            </div>
          </Card>
          <div className="mt-4 flex w-full justify-between">
            <Button className="bg-accent" onClick={() => prevFormStep()}>
              Back
            </Button>
            <Button onClick={() => createCredential()}>Create</Button>
          </div>
        </>
      )}

      {formStep === 2 && (
        <>
          <Card>
            <AdvancedFormPage onClose={() => null} onSubmit={() => null} />
          </Card>
          <div className="mt-4 flex w-full justify-between">
            <Button className="bg-accent" onClick={() => prevFormStep()}>
              Back
            </Button>
            <Button onClick={() => nextFormStep()}>Finalize</Button>
          </div>
        </>
      )}

      {formStep === 3 && (
        <>
          <Card>{/* Move to the connector's page iteslf */}</Card>
        </>
      )}

      <FixedLogo />
    </div>
  );
}
