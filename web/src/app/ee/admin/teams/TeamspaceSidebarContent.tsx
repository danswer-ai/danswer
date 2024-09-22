import { Teamspace } from "@/lib/types";
import { TeamspaceMember } from "./TeamspaceMember";
import { TeamspaceAssistant } from "./TeamspaceAssistant";
import { TeamspaceDocumentSet } from "./TeamspaceDocumentSet";
import { TeamspaceDataSource } from "./TeamspaceDataSource";
import { Shield } from "lucide-react";

interface TeamspaceSidebarContentProps {
  teamspace: Teamspace & { gradient: string };
  selectedTeamspaceId?: number;
}

export const TeamspaceSidebarContent = ({
  teamspace,
  selectedTeamspaceId,
}: TeamspaceSidebarContentProps) => {
  return (
    <>
      <div style={{ background: teamspace.gradient }} className="h-40 relative">
        <div className="absolute top-full -translate-y-1/2 left-1/2 -translate-x-1/2">
          <span
            style={{ background: teamspace.gradient }}
            className="text-3xl uppercase font-bold min-w-16 min-h-16 flex items-center justify-center rounded-xl text-inverted border-[5px] border-inverted"
          >
            {teamspace.name.charAt(0)}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center px-6 py-14 w-full">
        <div className="flex flex-col items-center">
          <h1 className="text-center font-bold text-xl md:text-[28px]">
            {teamspace.name}
          </h1>
          <span className="text-center text-primary pt-1 font-medium text-sm">
            @mrquilbot
          </span>
          <span className="text-center pt-4 font-bold text-sm flex items-center gap-1">
            <Shield size={16} />
            10231 Token rate
          </span>
          <p className="text-center text-subtle pt-4 text-sm">
            Lorem ipsum dolor, sit amet consectetur adipisicing elit.
            Perferendis omnis nesciunt est saepe sequi nam cum ratione
            aspernatur reprehenderit, ducimus illo eveniet et quidem itaque
            ipsam error nobis, dolores accusamus!
          </p>
        </div>

        <div className="w-full flex flex-col gap-4 pt-14">
          <TeamspaceMember
            teamspace={teamspace}
            selectedTeamspaceId={selectedTeamspaceId}
          />
          <TeamspaceAssistant teamspace={teamspace} />
          <TeamspaceDocumentSet teamspace={teamspace} />
          <TeamspaceDataSource teamspace={teamspace} />
        </div>
      </div>
    </>
  );
};
