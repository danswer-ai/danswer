"use client";

import { ListIndexingResponse } from "@/app/admin/connectors/interfaces";
import { fetcher } from "@/lib/fetcher";
import { timeAgo } from "@/lib/time";
import { CheckCircle, MinusCircle } from "@phosphor-icons/react";
import useSWR from "swr";

export enum ConnectorStatus {
  Running = "Running",
  NotSetup = "Not Setup",
}

interface ReccuringConnectorStatusProps {
  status: ConnectorStatus;
  source: string;
}

export const ReccuringConnectorStatus = ({
  status,
  source,
}: ReccuringConnectorStatusProps) => {
  const { data } = useSWR<ListIndexingResponse>(
    `/api/admin/connectors/${source}/index-attempt`,
    fetcher
  );

  const lastSuccessfulAttempt = data?.index_attempts
    .filter((attempt) => attempt.status === "success")
    .sort((a, b) => {
      if (a.time_updated === b.time_updated) {
        return 0;
      }
      return a.time_updated > b.time_updated ? -1 : 1;
    })[0];

  if (status === ConnectorStatus.Running) {
    return (
      <div>
        <div className="text-emerald-600 flex align-middle text-center">
          <CheckCircle size={20} className="my-auto" />
          <p className="my-auto ml-1">{status}</p>
        </div>
        {lastSuccessfulAttempt && (
          <p className="text-xs my-auto ml-1">
            Last updated {timeAgo(lastSuccessfulAttempt.time_updated)}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="text-gray-400 flex align-middle text-center">
      <MinusCircle size={20} className="my-auto" />
      <p className="my-auto ml-1">{status}</p>
    </div>
  );
};
