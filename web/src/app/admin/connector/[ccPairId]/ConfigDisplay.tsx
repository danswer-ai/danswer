import { List, ListItem, Card } from "@tremor/react";

function convertObjectToString(obj: any): string | any {
  console.log(obj);
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

export function ConfigDisplay({
  connectorSpecificConfig,
}: {
  connectorSpecificConfig: any;
}) {
  return (
    <Card className="max-w-xxl">
      <List>
        {Object.entries(connectorSpecificConfig).map(([key, value]) => (
          <ListItem key={key}>
            <span>{key}</span>
            <span>{convertObjectToString(value) || "-"}</span>
          </ListItem>
        ))}
      </List>
    </Card>
  );
}
