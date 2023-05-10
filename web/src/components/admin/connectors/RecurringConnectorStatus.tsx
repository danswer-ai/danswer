import { CheckCircle, MinusCircle } from "@phosphor-icons/react";

export enum ConnectorStatus {
  Running = "Running",
  NotSetup = "Not Setup",
}

interface ReccuringConnectorStatusProps {
  status: ConnectorStatus;
}

export const ReccuringConnectorStatus = ({
  status,
}: ReccuringConnectorStatusProps) => {
  if (status === ConnectorStatus.Running) {
    return (
      <div className="text-emerald-600 flex align-middle text-center">
        <CheckCircle size={20} className="my-auto" />
        <p className="my-auto ml-1">{status}</p>
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
