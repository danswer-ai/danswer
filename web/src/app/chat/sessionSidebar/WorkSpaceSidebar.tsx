import { UserSettingsButton } from "@/components/UserSettingsButton";
import { Ellipsis } from "lucide-react";
import Image from "next/image";

import ArnoldAi from "../../../../public/arnold_ai.png";
import { Separator } from "@/components/ui/separator";
import { User } from "@/lib/types";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Logo } from "@/components/Logo";
import { useContext } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { fetchSettingsSS } from "@/components/settings/lib";
import Link from "next/link";

interface WorkSpaceSidebarProps {
  openSidebar?: boolean;
  user?: User | null;
}

export const WorkSpaceSidebar = ({
  openSidebar,
  user,
}: WorkSpaceSidebarProps) => {
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const enterpriseSettings = combinedSettings.enterpriseSettings;
  const defaultPage = settings.default_page;

  return (
    <div className={`bg-background h-full p-4 border-r border-border`}>
      <div
        className={`h-full flex flex-col justify-between transition-opacity duration-300 ease-in-out lg:!opacity-100  ${
          openSidebar ? "opacity-100 delay-200" : "opacity-0 delay-100"
        }`}
      >
        <div className="flex flex-col items-center">
          <Image
            src={ArnoldAi}
            alt="ArnoldAi Logo"
            width={40}
            height={40}
            className="rounded-regular min-w-10 min-h-10 pb-6"
          />
          <Separator />
          <div className="flex flex-col items-center gap-4 pt-4">
            <CustomTooltip
              trigger={
                <Link href={`/${defaultPage}`} className="flex items-center">
                  <Logo />
                </Link>
              }
              side="right"
              delayDuration={0}
            >
              {enterpriseSettings!.application_name
                ? enterpriseSettings!.application_name
                : ""}
            </CustomTooltip>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <UserSettingsButton user={user} defaultPage={defaultPage} />
        </div>
      </div>
    </div>
  );
};
