import { HealthCheckBanner } from "../health/healthcheck";
import { Divider } from "@tremor/react";

export function AdminPageTitle({
  icon,
  title,
  farRightElement,
  includeDivider = true,
}: {
  icon: JSX.Element;
  title: string | JSX.Element;
  farRightElement?: JSX.Element;
  includeDivider?: boolean;
}) {
  return (
    <div>
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:gap-0">
        <h1 className="flex text-xl font-bold md:text-3xl text-strong gap-x-2">
          {icon} {title}
        </h1>
        {farRightElement && <div className="md:ml-auto">{farRightElement}</div>}
      </div>
      {includeDivider && <Divider />}
    </div>
  );
}
