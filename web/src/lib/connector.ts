import { PopupSpec } from "@/components/admin/connectors/Popup";
import { Connector, ConnectorBase, ValidSources } from "./types";
import { toast, useToast } from "@/hooks/use-toast";

async function handleResponse(
  response: Response
): Promise<[string | null, any]> {
  const responseJson = await response.json();
  if (response.ok) {
    return [null, responseJson];
  }
  return [responseJson.detail, null];
}

export async function createConnector<T>(
  connector: ConnectorBase<T>
): Promise<[string | null, Connector<T> | null]> {
  const response = await fetch(`/api/manage/admin/connector`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(connector),
  });
  return handleResponse(response);
}

export async function updateConnector<T>(
  connector: Connector<T>
): Promise<Connector<T>> {
  const response = await fetch(`/api/manage/admin/connector/${connector.id}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(connector),
  });
  return await response.json();
}

export async function disableConnector(
  connector: Connector<any>,
  onUpdate: () => void
) {
  updateConnector({
    ...connector,
    disabled: !connector.disabled,
  }).then(() => {
    toast({
      title: "Success",
      description: connector.disabled
        ? "Enabled connector!"
        : "Paused connector!",
      variant: "success",
    });
    onUpdate && onUpdate();
  });
}

export async function deleteConnector(
  connectorId: number
): Promise<string | null> {
  const response = await fetch(`/api/manage/admin/connector/${connectorId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  if (response.ok) {
    return null;
  }
  return (await response.json()).detail;
}

export async function runConnector(
  connectorId: number,
  credentialIds: number[],
  fromBeginning: boolean = false
): Promise<string | null> {
  const response = await fetch("/api/manage/admin/connector/run-once", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      connector_id: connectorId,
      credentialIds,
      from_beginning: fromBeginning,
    }),
  });
  if (!response.ok) {
    return (await response.json()).detail;
  }
  return null;
}

export async function deleteConnectorIfExistsAndIsUnlinked({
  source,
  name,
}: {
  source: ValidSources;
  name?: string;
}): Promise<string | null> {
  const connectorsResponse = await fetch("/api/manage/connector");
  if (connectorsResponse.ok) {
    const connectors = (await connectorsResponse.json()) as Connector<any>[];
    const matchingConnectors = connectors.filter(
      (connector) =>
        connector.source === source && (!name || connector.name === name)
    );
    if (
      matchingConnectors.length > 0 &&
      matchingConnectors[0].credential_ids.length === 0
    ) {
      const errorMsg = await deleteConnector(matchingConnectors[0].id);
      if (errorMsg) {
        return errorMsg;
      }
    }
  }
  return null;
}
