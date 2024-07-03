import CcPairIdConnector from "@/components/adminPageComponents/connector/CcPairIdConnector";
import { HealthCheckBanner } from "@/components/health/healthcheck";

export default function Page({ params }: { params: { ccPairId: string } }) {
  const ccPairId = parseInt(params.ccPairId);

  return (
    <div className="mx-auto container">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>

      <CcPairIdConnector ccPairId={ccPairId} />
    </div>
  );
}
