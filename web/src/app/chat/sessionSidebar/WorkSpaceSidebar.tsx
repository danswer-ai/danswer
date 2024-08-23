import { Button } from "@/components/ui/button";
import { UserSettingsButton } from "@/components/UserSettingsButton";
import { Ellipsis, Settings } from "lucide-react";
import Image from "next/image";

import Notion from "../../../../public/Notion.png";
import Dropbox from "../../../../public/Dropbox.png";
import Gitlab from "../../../../public/Gitlab.png";
import HubSpot from "../../../../public/HubSpot.png";
import enMedD from "../../../../public/logo.png";
import { Separator } from "@/components/ui/separator";
import { User } from "@/lib/types";
import { CustomTooltip } from "@/components/CustomTooltip";

interface WorkSpaceSidebarProps {
  openSidebar?: boolean;
  user?: User | null;
}

export const WorkSpaceSidebar = ({
  openSidebar,
  user,
}: WorkSpaceSidebarProps) => {
  return (
    <div className={`bg-background h-full p-4 border-r border-border`}>
      <div
        className={`h-full flex flex-col justify-between transition-opacity duration-300 ease-in-out lg:!opacity-100  ${
          openSidebar ? "opacity-100 delay-200" : "opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-6">
          <Image
            src={enMedD}
            alt="enMedD Logo"
            width={40}
            height={40}
            className="rounded-full min-w-10 min-h-10"
          />
          <Separator />
          <div className="flex flex-col items-center gap-6">
            <CustomTooltip
              trigger={
                <div className="flex items-center">
                  <Image
                    src={enMedD}
                    alt="enMedD Logo"
                    width={40}
                    height={40}
                    className="rounded-full min-w-10 min-h-10"
                  />{" "}
                </div>
              }
              side="right"
              delayDuration={0}
            >
              enMeDd
            </CustomTooltip>

            <CustomTooltip
              trigger={
                <div>
                  <Ellipsis />
                </div>
              }
              side="right"
              delayDuration={0}
            >
              More
            </CustomTooltip>
          </div>
        </div>
        <div>
          <Button variant="ghost" size="icon" className="mb-4">
            <Settings />
          </Button>
          <UserSettingsButton user={user} />
        </div>
      </div>
    </div>
  );
};
