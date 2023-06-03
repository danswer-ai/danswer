"use client";

import { PlugIcon } from "@/components/icons/icons";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/fetcher";
import { LoadingAnimation } from "@/components/Loading";
import { useRouter } from "next/navigation";
import { Popup, PopupSpec } from "@/components/admin/connectors/Popup";
import { useState } from "react";
import { HealthCheckBanner } from "@/components/health/healthcheck";
import { Connector, Credential, ValidSources } from "@/lib/types";
import { GoogleDriveCard } from "./GoogleDriveCard";
import { CardProps } from "./interface";

const connectorSourceToConnectorCard = (
  source: ValidSources
): React.FC<CardProps> | null => {
  switch (source) {
    case "google_drive":
      return GoogleDriveCard;
    default:
      return null;
  }
};

const Main = () => {
  const router = useRouter();
  const { mutate } = useSWRConfig();

  const {
    data: appCredentialData,
    isLoading: isAppCredentialLoading,
    error: isAppCredentialError,
  } = useSWR<{ client_id: string }>(
    "/api/manage/admin/connector/google-drive/app-credential",
    fetcher
  );
  const {
    data: connectorsData,
    isLoading: isConnectorDataLoading,
    error: isConnectorDataError,
  } = useSWR<Connector<any>[]>("/api/manage/connector", fetcher);
  const {
    data: credentialsData,
    isLoading: isCredentialsLoading,
    error: isCredentialsError,
  } = useSWR<Credential<any>[]>("/api/manage/credential", fetcher);

  const [popup, setPopup] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);
  const setPopupWithExpiration = (popupSpec: PopupSpec | null) => {
    setPopup(popupSpec);
    setTimeout(() => {
      setPopup(null);
    }, 4000);
  };

  if (
    isCredentialsLoading ||
    isAppCredentialLoading ||
    isConnectorDataLoading
  ) {
    return (
      <div className="mx-auto">
        <LoadingAnimation text="" />
      </div>
    );
  }

  if (isCredentialsError || !credentialsData) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">Failed to load credentials.</div>
      </div>
    );
  }

  if (isConnectorDataError || !connectorsData) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">Failed to load connectors.</div>
      </div>
    );
  }

  if (isAppCredentialError || !appCredentialData) {
    return (
      <div className="mx-auto">
        <div className="text-red-500">
          Error loading Google Drive app credentials. Contact an administrator.
        </div>
      </div>
    );
  }

  return (
    <>
      {popup && <Popup message={popup.message} type={popup.type} />}

      {connectorsData.map((connector) => {
        const connectorCard = connectorSourceToConnectorCard(connector.source);
        if (connectorCard) {
          return (
            <div key={connector.id}>
              {connectorCard({
                connector,
                userCredentials: credentialsData,
                setPopup: setPopupWithExpiration,
                router,
                mutate,
              })}
            </div>
          );
        }
      })}
    </>
  );
};

export default function Page() {
  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="border-solid border-gray-600 border-b mb-4 pb-2 flex">
        <PlugIcon size="32" />
        <h1 className="text-3xl font-bold pl-2">Personal Connectors</h1>
      </div>

      <Main />
    </div>
  );
}
