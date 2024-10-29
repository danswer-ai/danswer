import ConnectorWrapper from "@/app/admin/connectors/[connector]/ConnectorWrapper";
import { ConfigurableSources } from "@/lib/types";

export default async function Page({
  params,
}: {
  params: { connector: string, teamspaceId?: string };
}) {
  return (
    <ConnectorWrapper
      connector={params.connector.replace("-", "_") as ConfigurableSources}
      teamspaceId={params.teamspaceId}
    />
  );
}
