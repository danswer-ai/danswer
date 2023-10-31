import { HealthCheckBanner } from "../health/healthcheck";
import { Divider } from "@tremor/react";

export function AdminPageTitle({
  icon,
  title,
}: {
  icon: JSX.Element;
  title: string | JSX.Element;
}) {
  return (
    <div className="dark">
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <h1 className="text-3xl font-bold flex gap-x-2 mb-2">
        {icon} {title}
      </h1>
      <Divider />
    </div>
  );
}
