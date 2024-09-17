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
      <h3 className="mb-4 mt-12">Configuration</h3>
      <Card>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {configEntries.map(([key, value]) => (
              <li key={key} className="flex gap-10 justify-between">
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
