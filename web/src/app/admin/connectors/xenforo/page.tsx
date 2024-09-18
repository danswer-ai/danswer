"use client";

import * as Yup from "yup";
import {
  XenforoIcon,
  ArrowSquareOutIcon,
  GearIcon,
} from "@/components/icons/icons";
import { TextFormField } from "@/components/admin/connectors/Field";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { ConnectorIndexingStatus } from "@/lib/types";
import { XenforoConfig } from "@/lib/connectors/connectors";
import useSWR, { useSWRConfig } from "swr";
import { errorHandlingFetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { ConnectorForm } from "@/components/admin/connectors/ConnectorForm";
import { ConnectorsTable } from "@/components/admin/connectors/table/ConnectorsTable";
import { AdminPageTitle } from "@/components/admin/Title";
import { Card, Text, Title } from "@tremor/react";

const Main = () => {
  const { mutate } = useSWRConfig();

  const {
    data: connectorIndexingStatuses,
    isLoading: isConnectorIndexingStatusesLoading,
    error: isConnectorIndexingStatusesError,
  } = useSWR<ConnectorIndexingStatus<any, any>[]>(
    "/api/manage/admin/connector/indexing-status",
    errorHandlingFetcher
  );

  const xenforoConnectorIndexingStatuses: ConnectorIndexingStatus<
    XenforoConfig,
    {}
  >[] =
    connectorIndexingStatuses?.filter(
      (connectorIndexingStatus) =>
        connectorIndexingStatus.connector.source === "xenforo"
    ) ?? [];

  return (
    <>
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Step 1: Specify which XenForo v2.2 forum URL to index. Can be board or
        thread.
      </Title>
      <p className="text-sm mb-2">
        We re-fetch the latest state of the website once a day.
      </p>
      <Card>
        <ConnectorForm<XenforoConfig>
          nameBuilder={(values) => `XenforoConnector-${values.base_url}`}
          ccPairNameBuilder={(values) => values.base_url}
          // Since there is no "real" credential associated with a xenforo connector,
          // we create a dummy one here so that we can associate the CC Pair with a
          // user. This is needed since the user for a CC Pair is found via the credential
          // associated with it.
          shouldCreateEmptyCredentialForConnector={true}
          source="xenforo"
          inputType="load_state"
          formBody={
            <>
              <TextFormField
                name="base_url"
                label="Forum board or thread URL to Index:"
                autoCompleteDisabled={false}
              />
            </>
          }
          validationSchema={Yup.object().shape({
            base_url: Yup.string().required(
              "Please enter the forum URL to scrape e.g. https://my.web.site/forum/boards/my-board/"
            ),
          })}
          initialValues={{
            base_url: "",
          }}
          refreshFreq={60 * 60 * 24} // 1 day
        />
      </Card>
      <Title className="mb-2 mt-6 ml-auto mr-auto">
        Already Indexed forum URLs
      </Title>
      {isConnectorIndexingStatusesLoading ? (
        <LoadingAnimation text="Loading" />
      ) : isConnectorIndexingStatusesError || !connectorIndexingStatuses ? (
        <div>Error loading indexing history</div>
      ) : xenforoConnectorIndexingStatuses.length > 0 ? (
        <ConnectorsTable<XenforoConfig, {}>
          connectorIndexingStatuses={xenforoConnectorIndexingStatuses}
          specialColumns={[
            {
              header: "Base URL",
              key: "base_url",
              getValue: (
                ccPairStatus: ConnectorIndexingStatus<XenforoConfig, any>
              ) => {
                const connectorConfig =
                  ccPairStatus.connector.connector_specific_config;
                return (
                  <div className="flex w-fit">
                    <a
                      className="text-blue-500 ml-1 my-auto flex"
                      href={connectorConfig.base_url}
                    >
                      {connectorConfig.base_url}
                      <ArrowSquareOutIcon className="my-auto flex flex-shrink-0 text-blue-500" />
                    </a>
                    <a
                      className="my-auto"
                      href={`/admin/connector/${ccPairStatus.cc_pair_id}`}
                    >
                      <GearIcon className="ml-2 my-auto flex flex-shrink-0 text-gray-400" />
                    </a>
                  </div>
                );
              },
            },
          ]}
          onUpdate={() => mutate("/api/manage/admin/connector/indexing-status")}
        />
      ) : (
        <p className="text-sm">No indexed forums found</p>
      )}
    </>
  );
};

export default function Page() {
  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <AdminPageTitle icon={<XenforoIcon size={32} />} title="Xenforo" />

      <Main />
    </div>
  );
}
