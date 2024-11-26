import Link from "next/link";
import { CustomTooltip } from "./CustomTooltip";
import { MinimalTeamspaceSnapshot } from "@/lib/types";
import { buildImgUrl } from "@/app/chat/files/images/utils";
import { useGradient } from "@/hooks/useGradient";

interface TeamspaceBubbleProps {
  teamspace?: MinimalTeamspaceSnapshot | undefined;
  link: string;
  teamspaceId?: string | string[];
}

export const TeamspaceBubble = ({
  teamspace,
  link,
  teamspaceId,
}: TeamspaceBubbleProps) => {
  if (!teamspace) return null;

  return (
    <CustomTooltip
      trigger={
        <Link
          href={`/${link}`}
          className={`relative w-10 h-10 shrink-0 rounded-md overflow-hidden flex items-center justify-center ${Number(teamspaceId) === teamspace.id ? "bg-secondary-500" : ""}`}
        >
          {teamspace.logo ? (
            <img
              src={buildImgUrl(teamspace.logo)}
              alt="Teamspace Logo"
              className={`object-cover ${Number(teamspaceId) === teamspace.id ? "w-8 h-8 rounded-sm" : "w-full h-full"}`}
              width={40}
              height={40}
            />
          ) : (
            <div
              style={{ background: useGradient(teamspace.name) }}
              className={`font-bold text-inverted bg-brand-500 flex justify-center items-center uppercase ${Number(teamspaceId) === teamspace.id ? "w-8 h-8 rounded-sm" : "w-full h-full"}`}
            >
              {teamspace.name.charAt(0)}
            </div>
          )}
        </Link>
      }
      side="right"
      delayDuration={0}
      asChild
    >
      {teamspace.name}
    </CustomTooltip>
  );
};
