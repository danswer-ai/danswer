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

interface WorkSpaceSidebarProps {
  openSidebar?: boolean;
  user?: User | null;
}

export const WorkSpaceSidebar = ({
  openSidebar,
  user,
}: WorkSpaceSidebarProps) => {
  return (
    <div className={`bg-background h-full px-4 py-6 border-r border-border`}>
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
            {/* <Button variant="ghost" size="icon">
              <Image src={Notion} alt="Notion" width={30} height={30} />
            </Button>
            <Button variant="ghost" size="icon">
              <Image src={Dropbox} alt="Dropbox" width={30} height={30} />
            </Button>
            <Button variant="ghost" size="icon">
              <Image src={Gitlab} alt="Gitlab" width={30} height={30} />
            </Button>
            <Button variant="ghost" size="icon">
              <Image src={HubSpot} alt="HubSpot" width={30} height={30} />
            </Button>
            <Button variant="ghost" size="icon">
              <Ellipsis />
            </Button> */}
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
