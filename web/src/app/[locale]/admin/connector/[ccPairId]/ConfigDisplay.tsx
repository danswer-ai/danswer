import { getNameFromPath } from "@/lib/fileUtils";
import { ValidSources } from "@/lib/types";
import { List, ListItem, Card, Title } from "@tremor/react";

function convertObjectToString(obj: any): string | any {
  // Check if obj is an object and not an array or null
  if (typeof obj === "object" && obj !== null) {
    if (!Array.isArray(obj)) {
      return JSON.stringify(obj);
    } else {
      if (obj.length === 0) {
        return null;
      }
      return obj.map((item) => convertObjectToString(item));
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
  } else if (sourceType === "google_sites") {
    return {
      base_url: obj.base_url,
    };
  }
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
      <Title className="mb-2">Configuration</Title>
      <Card>
        <List>
          {configEntries.map(([key, value]) => (
            <ListItem key={key}>
              <span>{key}</span>
              <span>{convertObjectToString(value) || "-"}</span>
            </ListItem>
          ))}
        </List>
      </Card>
    </>
  );
}
