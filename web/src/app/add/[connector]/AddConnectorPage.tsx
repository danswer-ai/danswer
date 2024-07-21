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
  console.log(connector);

  const configuration: ConnectionConfiguration =
    getComprehensiveConnectorConfigTemplate(connector);

  console.log(configuration);
  return (
    <div className="mx-auto w-full">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      {getSourceDisplayName(connector as ValidSources)}
      <AdminPageTitle icon={<SlackIcon size={32} />} title="Slack" />
      {formStep == 0 && (
        <Card>
          <Title className="mb-2">Select a credential</Title>
          <CredentialSection ccPair={ccPair} />
        </Card>
      )}
      {formStep == 1 && (
        <Card>
          <DynamicConnectionForm
            config={configuration}
            onSubmit={() => null}
            onClose={() => null}
          />
          <div className="flex w-full">
            <Button className="ml-auto">Advanced?</Button>
          </div>
        </Card>
      )}
      {formStep === 2 && <Card>{/* Advanced settings */}</Card>}
      {formStep === 3 && (
        <Card>{/* Move to the connector's page iteslf */}</Card>
      )}
      <div className="mt-4 flex w-full justify-between">
        <Button className="bg-accent" onClick={() => prevFormStep()}>
          Previous
        </Button>

        <Button onClick={() => nextFormStep()}>Continue</Button>
      </div>
      <FixedLogo />
    </div>
  );
}
