"use client";

import * as Yup from "yup";
import { SlackIcon } from "@/components/icons/icons";
import { errorHandlingFetcher } from "@/lib/fetcher";
import useSWR, { useSWRConfig } from "swr";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import {
  Credential,
  ValidSources,
  getComprehensiveConnectorConfigTemplate,
} from "@/lib/types";
import { Button, Card, Title } from "@tremor/react";
import { AdminPageTitle } from "@/components/admin/Title";
import FixedLogo from "@/app/chat/shared_chat_search/FixedLogo";
import { CCPairFullInfo } from "@/app/admin/connector/[ccPairId]/types";
import { buildCCPairInfoUrl } from "@/app/admin/connector/[ccPairId]/lib";
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

  const { setFormValues, formStep, formValues, nextFormStep, prevFormStep } =
    useFormContext();

  const { popup, setPopup } = usePopup();
  if (!ccPair) {
    return <></>;
  }

  const configuration: ConnectionConfiguration =
    getComprehensiveConnectorConfigTemplate(connector);

  const createCredential = () => {};
  const displayName = getSourceDisplayName(connector) || connector;

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
            <CredentialSection ccPair={ccPair} />
          </Card>

          <div className="mt-4 flex w-full justify-end">
            <Button onClick={() => nextFormStep()}>Continue</Button>
          </div>
        </>
      )}

      {formStep == 1 && (
        <>
          <Card>
            <DynamicConnectionForm
              config={configuration}
              onSubmit={() => null}
              onClose={() => null}
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
