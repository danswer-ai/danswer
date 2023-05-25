import { Connector, ConnectorBase } from "./types";

export async function createConnector<T>(
  connector: ConnectorBase<T>
): Promise<Connector<T>> {
  const response = await fetch(`/api/admin/connector`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(connector),
  });
  return response.json();
}

export async function deleteConnector<T>(
  connectorId: number
): Promise<Connector<T>> {
  const response = await fetch(`/api/admin/connector/${connectorId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });
  return response.json();
}
