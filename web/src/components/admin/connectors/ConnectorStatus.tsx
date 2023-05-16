"use client";

import {
  IndexAttempt,
  ListIndexingResponse,
  ValidSources,
} from "@/components/admin/connectors/interfaces";
import { fetcher } from "@/lib/fetcher";
import { timeAgo } from "@/lib/time";
import { CheckCircle, MinusCircle } from "@phosphor-icons/react";
import useSWR from "swr";

export enum ConnectorStatusEnum {
  Setup = "Setup",
  Running = "Running",
  NotSetup = "Not Setup",
}

const sortIndexAttemptsByTimeUpdated = (a: IndexAttempt, b: IndexAttempt) => {
  if (a.time_updated === b.time_updated) {
    return 0;
  }
  return a.time_updated > b.time_updated ? -1 : 1;
};

interface ConnectorStatusProps {
  status: ConnectorStatusEnum;
  source: ValidSources;
}

export const ConnectorStatus = ({ status, source }: ConnectorStatusProps) => {
  const { data } = useSWR<ListIndexingResponse>(
    `/api/admin/connectors/${source}/index-attempt`,
    fetcher
  );

  const lastSuccessfulAttempt = data?.index_attempts
    .filter((attempt) => attempt.status === "success")
    .sort(sortIndexAttemptsByTimeUpdated)[0];

  if (
    status === ConnectorStatusEnum.Running ||
    status == ConnectorStatusEnum.Setup
  ) {
    return (
      <div>
        <div className="text-emerald-600 flex align-middle text-center">
          <CheckCircle size={20} className="my-auto" />
          <p className="my-auto ml-1">{status}</p>
        </div>
        {lastSuccessfulAttempt && (
          <p className="text-xs my-auto ml-1">
            Last indexed {timeAgo(lastSuccessfulAttempt.time_updated)}
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
