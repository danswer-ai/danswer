"use client";

import { LoadingAnimation } from "@/components/Loading";
import { NotebookIcon } from "@/components/icons/icons";
import { CCPairIndexingStatusTable } from "./CCPairIndexingStatusTable";
import { AdminPageTitle } from "@/components/admin/Title";
import Link from "next/link";
import Text from "@/components/ui/text";
import { useConnectorCredentialIndexingStatus } from "@/lib/hooks";
import { usePopupFromQuery } from "@/components/popup/PopupFromQuery";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

function Main() {
  const { t } = useTranslation("connectors");
  const {
    data: indexAttemptData,
    isLoading: indexAttemptIsLoading,
    error: indexAttemptError,
  } = useConnectorCredentialIndexingStatus();
  const {
    data: editableIndexAttemptData,
    isLoading: editableIndexAttemptIsLoading,
    error: editableIndexAttemptError,
  } = useConnectorCredentialIndexingStatus(undefined, true);

  if (indexAttemptIsLoading || editableIndexAttemptIsLoading) {
    return <LoadingAnimation text="" />;
  }

  if (
    indexAttemptError ||
    !indexAttemptData ||
    editableIndexAttemptError ||
    !editableIndexAttemptData
  ) {
    return (
      <div className="text-error">
        {indexAttemptError?.info?.detail ||
          editableIndexAttemptError?.info?.detail ||
          t("errorLoadingIndexingHistory", { defaultValue: "Error loading indexing history." })}
      </div>
    );
  }

  if (indexAttemptData.length === 0) {
    return (
      <Text>
        {t("noConnectorsSetup", { defaultValue: "It looks like you don't have any connectors setup yet." })}
        {" "}
        <Link className="text-link" href="/admin/add-connector">
          {t("addConnectorPageLink", { defaultValue: "Add Connector" })}
        </Link>{" "}
        {t("toGetStarted", { defaultValue: "page to get started!" })}
      </Text>
    );
  }

  // sort by source name
  indexAttemptData.sort((a, b) => {
    if (a.connector.source < b.connector.source) {
      return -1;
    } else if (a.connector.source > b.connector.source) {
      return 1;
    } else {
      return 0;
    }
  });

  return (
    <CCPairIndexingStatusTable
      ccPairsIndexingStatuses={indexAttemptData}
      editableCcPairsIndexingStatuses={editableIndexAttemptData}
    />
  );
}

export default function Status() {
  const { t } = useTranslation("connectors");
  const { popup } = usePopupFromQuery({
    "connector-created": {
      message: t("connectorCreatedSuccess", { defaultValue: "Connector created successfully" }),
      type: "success",
    },
    "connector-deleted": {
      message: t("connectorDeletedSuccess", { defaultValue: "Connector deleted successfully" }),
      type: "success",
    },
  });

  return (
    <div className="mx-auto container">
      {popup}
      <AdminPageTitle
        icon={<NotebookIcon size={32} />}
        title={t("existingConnectors", { defaultValue: "Existing Connectors" })}
        farRightElement={
          <Link href="/admin/add-connector">
            <Button variant="success-reverse">
              {t("addConnectorButton", { defaultValue: "Add Connector" })}
            </Button>
          </Link>
        }
      />

      <Main />
    </div>
  );
}
