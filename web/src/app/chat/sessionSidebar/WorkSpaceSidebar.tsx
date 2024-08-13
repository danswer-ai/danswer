import { useChatContext } from "@/components/context/ChatContext";
import { Button } from "@/components/ui/button";
import { UserSettingsButton } from "@/components/UserSettingsButton";
import { Settings } from "lucide-react";
import Image from "next/image";

import Notion from "../../../../public/Notion.png";
import Dropbox from "../../../../public/Dropbox.png";
import Gitlab from "../../../../public/Gitlab.png";
import HubSpot from "../../../../public/HubSpot.png";
import Vanguard from "../../../../public/Vanguard.png";
import { Separator } from "@/components/ui/separator";

interface WorkSpaceSidebarProps {
  openSidebar: boolean;
}

export const WorkSpaceSidebar = ({ openSidebar }: WorkSpaceSidebarProps) => {
  let { user } = useChatContext();

  return (
    <div className={`bg-background h-full px-4 py-6 border-r border-border`}>
      <div
        className={`h-full flex flex-col justify-between transition-opacity duration-300 ease-in-out lg:!opacity-100  ${
          openSidebar ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex flex-col items-center gap-6">
          <Image
            src={Vanguard}
            alt="Vanguard"
            width={40}
            height={40}
            className="rounded-full min-w-10 min-h-10"
          />
          <Separator />
          <Image src={Notion} alt="Notion" width={30} height={30} />
          <Image src={Dropbox} alt="Dropbox" width={30} height={30} />
          <Image src={Gitlab} alt="Gitlab" width={30} height={30} />
          <Image src={HubSpot} alt="HubSpot" width={30} height={30} />
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
