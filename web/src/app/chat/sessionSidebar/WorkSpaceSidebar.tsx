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

interface WorkSpaceSidebarProps {
  openSidebar?: boolean;
  user?: User | null;
}

export const WorkSpaceSidebar = ({
  openSidebar,
  user,
}: WorkSpaceSidebarProps) => {
  const settings = useContext(SettingsContext);

  if (!settings?.enterpriseSettings!.application_name) {
    return null;
  }

  return (
    <div className={`bg-background h-full px-4 py-6 border-r border-border`}>
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
                <div className="flex items-center">
                  <Logo />
                </div>
              }
              side="right"
              delayDuration={0}
            >
              {settings!.enterpriseSettings!.application_name
                ? settings!.enterpriseSettings!.application_name
                : ""}
            </CustomTooltip>

            <CustomTooltip
              trigger={
                <div className="h-10 w-10 hover:bg-light hover:text-accent-foreground flex items-center justify-center rounded-regular">
                  <Ellipsis size={16} strokeWidth={2.5} />
                </div>
              }
              side="right"
              delayDuration={0}
            >
              More
            </CustomTooltip>
          </div>
        </div>
        <div className="flex flex-col items-center gap-4">
          <UserSettingsButton user={user} />
        </div>
      </div>
    </div>
  );
};
