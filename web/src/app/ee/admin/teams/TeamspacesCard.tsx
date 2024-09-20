import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Teamspace } from "@/lib/types";
import { Cpu, Users } from "lucide-react";

interface TeamspaceWithGradient extends Teamspace {
  gradient?: string;
}

interface TeamspacesCardProps {
  teamspaces: TeamspaceWithGradient[];
  refresh: () => void;
  onClick: (teamspaceId: number) => void;
}

export const TeamspacesCard = ({
  teamspaces,
  refresh,
  onClick,
}: TeamspacesCardProps) => {
  return (
    <>
      {teamspaces
        .filter((teamspace) => !teamspace.is_up_for_deletion)
        .map((teamspace) => {
          return (
            <Card
              key={teamspace.id}
              className="overflow-hidden !rounded-xl cursor-pointer xl:min-w-[280px] md:max-w-[350px] justify-start items-start"
              onClick={() => onClick(teamspace.id)}
            >
              <CardHeader
                style={{ background: teamspace.gradient }}
                className="p-8"
              ></CardHeader>
              <CardContent className="flex flex-col justify-between min-h-48 relative bg-muted/50">
                <div className="absolute top-0 -translate-y-1/2 right-4">
                  <span
                    style={{ background: teamspace.gradient }}
                    className="text-xl uppercase font-bold min-w-12 min-h-12 flex items-center justify-center rounded-lg text-inverted border-[5px] border-inverted w-full"
                  >
                    {teamspace.name.charAt(0)}
                  </span>
                </div>
                <div className="pb-6">
                  <h2 className="font-bold whitespace-normal break-all w-full">
                    {teamspace.name}
                  </h2>
                  <span className="text-sm text-subtle">@mrquilbot</span>
                </div>

                <div className="w-full flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Users size={16} />
                    {teamspace.users.length} People
                  </span>

                  <span className="flex items-center gap-2">
                    <Cpu size={16} />
                    {teamspace.cc_pairs.length} Assistant
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
    </>
  );
};
