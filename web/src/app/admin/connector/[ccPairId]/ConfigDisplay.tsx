import { Card, CardContent } from "@/components/ui/card";
import { getNameFromPath } from "@/lib/fileUtils";
import { ValidSources } from "@/lib/types";
import { List, ListItem, Title } from "@tremor/react";

function convertObjectToString(obj: any): string | any {
  // Check if obj is an object and not an array or null
  if (typeof obj === "object" && obj !== null) {
    if (!Array.isArray(obj)) {
      return JSON.stringify(obj);
    } else {
      if (obj.length === 0) {
        return null;
      }
      return obj.map((item) => convertObjectToString(item)).join(", ");
    }
  }
  if (typeof obj === "boolean") {
    return obj.toString();
  }
  return obj;
}

function buildConfigEntries(
  obj: any,
  sourceType: ValidSources
): { [key: string]: string } {
  if (sourceType === "file") {
    return obj.file_locations
      ? {
          file_names: obj.file_locations.map(getNameFromPath),
        }
      : {};
  }
  // else if (sourceType === "google_sites") {
  //   return {
  //     base_url: obj.base_url,
  //   };
  // }
  return obj;
}

export function AdvancedConfigDisplay({
  pruneFreq,
  refreshFreq,
  indexingStart,
}: {
  pruneFreq: number | null;
  refreshFreq: number | null;
  indexingStart: Date | null;
}) {
  const formatRefreshFrequency = (seconds: number | null): string => {
    if (seconds === null) return "-";
    const minutes = Math.round(seconds / 60);
    return `${minutes} minute${minutes !== 1 ? "s" : ""}`;
  };
  const formatPruneFrequency = (seconds: number | null): string => {
    if (seconds === null) return "-";
    const days = Math.round(seconds / (60 * 60 * 24));
    return `${days} day${days !== 1 ? "s" : ""}`;
  };

  const formatDate = (date: Date | null): string => {
    if (date === null) return "-";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    });
  };

  return (
    <>
      <h3 className="mt-8 mb-2">Advanced Configuration</h3>
      <Card>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {pruneFreq && (
              <li key={0} className="flex justify-between gap-10">
                <span>Pruning Frequency</span>
                <span>{formatPruneFrequency(pruneFreq)}</span>
              </li>
            )}
            {refreshFreq && (
              <li key={1} className="flex justify-between gap-10">
                <span>Refresh Frequency</span>
                <span>{formatRefreshFrequency(refreshFreq)}</span>
              </li>
            )}
            {indexingStart && (
              <li key={2} className="flex justify-between gap-10">
                <span>Indexing Start</span>
                <span>{formatDate(indexingStart)}</span>
              </li>
            )}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

export function ConfigDisplay({
  connectorSpecificConfig,
  sourceType,
}: {
  connectorSpecificConfig: any;
  sourceType: ValidSources;
}) {
  const configEntries = Object.entries(
    buildConfigEntries(connectorSpecificConfig, sourceType)
  );
  if (!configEntries.length) {
    return null;
  }

  return (
    <>
      <h3 className="mt-12 mb-2">Configuration</h3>
      <Card>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {configEntries.map(([key, value]) => (
              <li key={key} className="flex justify-between gap-10">
                <span>{key}:</span>
                <span className="truncate">
                  {convertObjectToString(value) || "-"}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}
