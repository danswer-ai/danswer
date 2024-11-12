"use client";

import { UserSettingsButton } from "@/components/UserSettingsButton";
import ArnoldAi from "../../../public/logo-brand.png";
import { Separator } from "@/components/ui/separator";
import { User } from "@/lib/types";
import { CustomTooltip } from "@/components/CustomTooltip";
import { Logo } from "@/components/Logo";
import { useContext } from "react";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import Link from "next/link";
import { TeamspaceBubble } from "@/components/TeamspaceBubble";
import Image from "next/image";
import { TeamspaceModal } from "./TeamspaceModal";
import { useParams, useRouter } from "next/navigation";

interface GlobalSidebarProps {
  openSidebar?: boolean;
  user?: User | null;
}

export const GlobalSidebar = ({ openSidebar, user }: GlobalSidebarProps) => {
  const { teamspaceId } = useParams();
  const combinedSettings = useContext(SettingsContext);
  if (!combinedSettings) {
    return null;
  }
  const settings = combinedSettings.settings;
  const workspaces = combinedSettings.workspaces;
  const defaultPage = settings.default_page;

  let teamsapces = user?.groups || [];
  if (teamspaceId) {
    const matchingTeamspace = teamsapces.find(
      (group) => group.id.toString() === teamspaceId
    );
    const otherTeamspaces = teamsapces.filter(
      (group) => group.id.toString() !== teamspaceId
    );
    teamsapces = matchingTeamspace
      ? [matchingTeamspace, ...otherTeamspaces]
      : otherTeamspaces;
  }
  const displayedTeamspaces = teamsapces.slice(0, 8);
  const showEllipsis = user?.groups && user.groups.length > 8;

  return (
    <div className={`bg-background h-full p-4 border-r border-border z-10`}>
      <div
        className={`h-full flex flex-col justify-between transition-opacity duration-300 ease-in-out lg:!opacity-100  ${
          openSidebar ? "opacity-100 delay-200" : "opacity-0 delay-100"
        }`}
      >
        <div className="flex flex-col items-center h-full overflow-y-auto">
          <Image
            src={ArnoldAi}
            alt="enMedD AI Logo"
            width={40}
            height={40}
            className="rounded-regular shrink-0"
          />
          <Separator className="mt-4" />
          <div className="flex flex-col items-center gap-4 pt-4">
            <CustomTooltip
              trigger={
                <Link href={`/${defaultPage}`} className="flex items-center">
                  <Logo />
                </Link>
              }
              side="right"
              delayDuration={0}
              asChild
            >
              {workspaces?.workspace_name
                ? workspaces.workspace_name
                : "enMedD AI"}
            </CustomTooltip>
          </div>
          <Separator className="mt-4" />
          {user?.groups && (
            <div className="flex flex-col items-center gap-3 pt-4">
              {displayedTeamspaces?.map((teamspace) => (
                <TeamspaceBubble
                  key={teamspace.id}
                  teamspace={teamspace}
                  link={`t/${teamspace.id}/${defaultPage}`}
                  teamspaceId={teamspaceId}
                />
              ))}
              {showEllipsis && (
                <TeamspaceModal
                  teamspace={teamsapces}
                  defaultPage={defaultPage}
                  teamspaceId={teamspaceId}
                />
              )}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-4 mt-5">
          <UserSettingsButton defaultPage={defaultPage} />
        </div>
      </div>
    </div>
  );
};
