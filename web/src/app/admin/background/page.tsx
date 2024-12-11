"use client";

import { LoadingAnimation } from "@/components/Loading";
import { AdminPageTitle } from "@/components/admin/Title";
import { NotebookIcon } from "@/components/icons/icons";
import Text from "@/components/ui/text";
import { useBackgroundIndexingStatus } from "@/lib/hooks";
import { useEffect } from "react";
import { BackgroundIndexingStatusTable } from "./BackgroundIndexingStatusTable";

function Main() {
  const {
    data: indexingData,
    isLoading: isIndexingDataLoading,
    error: indexingError,
    refreshBackgroundIndexingStatus: refreshStatus,
  } = useBackgroundIndexingStatus();

  useEffect(() => {
    const interval = setInterval(() => {
      refreshStatus(); // Call the refresh function every 5 seconds
    }, 5000);

    return () => clearInterval(interval); // Cleanup on component unmount
  }, [refreshStatus]);

  if (isIndexingDataLoading) {
    return <LoadingAnimation text="" />;
  }

  if (indexingError || !indexingData) {
    return (
      <div className="text-error">
        {indexingError?.info?.detail ||
          "Error getting background indexing status."}
      </div>
    );
  }

  if (indexingData.length === 0) {
    return <Text>No indexing attempts in progress.</Text>;
  }

  return <BackgroundIndexingStatusTable indexingStatuses={indexingData} />;
}

export default function Status() {
  return (
    <div className="mx-auto container">
      <AdminPageTitle
        icon={<NotebookIcon size={32} />}
        title="Background Indexing"
      />

      <Main />
    </div>
  );
}
