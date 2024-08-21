import { HealthCheckBanner } from "../health/healthcheck";

export function AdminPageTitle({
  icon,
  title,
  farRightElement,
}: {
  icon: JSX.Element;
  title: string | JSX.Element;
  farRightElement?: JSX.Element;
}) {
  return (
    <div>
      <div className="mb-4">
        <HealthCheckBanner />
      </div>
      <div className="flex flex-col gap-4 md:flex-row md:gap-0 pb-4">
        <h1 className="flex items-center font-bold text-xl md:text-[28px] text-strong gap-x-2">
          {icon} {title}
        </h1>
        {farRightElement && <div className="md:ml-auto">{farRightElement}</div>}
      </div>
    </div>
  );
}
