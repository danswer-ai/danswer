import { NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED } from "@/lib/constants";
import { HeaderTitle } from "./header/HeaderTitle";
import LogoType, { Logo } from "./Logo";
import { EnterpriseSettings } from "@/app/admin/settings/interfaces";

export default function LogoTypeContainer({
  enterpriseSettings,
}: {
  enterpriseSettings: EnterpriseSettings | null;
}) {
  const onlyLogo =
    !enterpriseSettings ||
    !enterpriseSettings.use_custom_logo ||
    !enterpriseSettings.application_name;

  return (
    <div className="flex justify-start items-start  w-full gap-x-1 my-auto">
      <div className="flex-none w-fit  mr-auto  my-auto">
        {onlyLogo ? <LogoType /> : <Logo height={24} width={24} />}
      </div>

      {!onlyLogo && (
        <div className="w-full">
          {enterpriseSettings && enterpriseSettings.application_name ? (
            <div>
              <HeaderTitle>{enterpriseSettings.application_name}</HeaderTitle>
              {!NEXT_PUBLIC_DO_NOT_USE_TOGGLE_OFF_DANSWER_POWERED && (
                <p className="text-xs text-subtle">Powered by Onyx</p>
              )}
            </div>
          ) : (
            <HeaderTitle>Onyx</HeaderTitle>
          )}
        </div>
      )}
    </div>
  );
}
