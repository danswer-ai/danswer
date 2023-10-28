import { getCCPairSS } from "@/lib/ss/ccPair";
import { CCPairFullInfo } from "./types";
import { getErrorMsg } from "@/lib/fetchUtils";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { CCPairStatus } from "@/components/Status";
import { BackButton } from "@/components/BackButton";
import { Button, Divider, Title } from "@tremor/react";
import { IndexingAttemptsTable } from "./IndexingAttemptsTable";
import { Text } from "@tremor/react";
import { ConfigDisplay } from "./ConfigDisplay";
import { ModifyStatusButtonCluster } from "./ModifyStatusButtonCluster";
import { DeletionButton } from "./DeletionButton";
import { SSRAutoRefresh } from "@/components/SSRAutoRefresh";
import { ErrorCallout } from "@/components/ErrorCallout";
import { ReIndexButton } from "./ReIndexButton";

export default async function Page({
  params,
}: {
  params: { ccPairId: string };
}) {
  const ccPairId = parseInt(params.ccPairId);

  const ccPairResponse = await getCCPairSS(ccPairId);
  if (!ccPairResponse.ok) {
    const errorMsg = await getErrorMsg(ccPairResponse);
    return (
      <div className="mx-auto container">
        <BackButton />
        <ErrorCallout errorTitle={errorMsg} />
      </div>
    );
  }

  const ccPair = (await ccPairResponse.json()) as CCPairFullInfo;
  const lastIndexAttempt = ccPair.index_attempts[0];
  const isDeleting =
    ccPair?.latest_deletion_attempt?.status === "PENDING" ||
    ccPair?.latest_deletion_attempt?.status === "STARTED";

  return (
    <>
      <SSRAutoRefresh />
      <div className="mx-auto container dark">
        <div className="mb-4">
          <HealthCheckBanner />
        </div>

        <BackButton />
        <div className="pb-1 flex mt-1">
          <h1 className="text-3xl font-bold">{ccPair.name}</h1>

          <div className="ml-auto">
            <ModifyStatusButtonCluster ccPair={ccPair} />
          </div>
        </div>

        <CCPairStatus
          status={lastIndexAttempt?.status || "not_started"}
          disabled={ccPair.connector.disabled}
          isDeleting={isDeleting}
        />

        <div className="text-gray-400 text-sm mt-1">
          Total Documents Indexed:{" "}
          <b className="text-gray-300">{ccPair.num_docs_indexed}</b>
        </div>

        <Divider />

        <ConfigDisplay
          connectorSpecificConfig={ccPair.connector.connector_specific_config}
          sourceType={ccPair.connector.source}
        />
        {/* NOTE: no divider / title here for `ConfigDisplay` since it is optional and we need
        to render these conditionally.*/}

        <div className="mt-6">
          <div className="flex">
            <Title>Indexing Attempts</Title>

            <ReIndexButton
              connectorId={ccPair.connector.id}
              credentialId={ccPair.credential.id}
            />
          </div>

          <IndexingAttemptsTable ccPair={ccPair} />
        </div>

        <Divider />

        <div className="mt-4">
          <Title>Delete Connector</Title>
          <Text>
            Deleting the connector will also delete all associated documents.
          </Text>

          <div className="flex mt-16">
            <div className="mx-auto">
              <DeletionButton ccPair={ccPair} />
            </div>
          </div>
        </div>

        {/* TODO: add document search*/}
      </div>
    </>
  );
}
