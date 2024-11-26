import { Main } from "@/app/admin/connector/[ccPairId]/Main";

export default function Page({
  params,
}: {
  params: { ccPairId: string; teamsapceId: string };
}) {
  const ccPairId = parseInt(params.ccPairId);

  return (
    <div className="w-full h-full overflow-y-auto">
      <div className="container">
        <Main ccPairId={ccPairId} teamspaceId={params.teamsapceId} />
      </div>
    </div>
  );
}
