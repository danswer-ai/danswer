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
              className="overflow-hidden !rounded-xl cursor-pointer"
              onClick={() => onClick(teamspace.id)}
            >
              <CardHeader
                style={{ background: teamspace.gradient }}
                className="p-10"
              ></CardHeader>
              <CardContent className="flex flex-col justify-between min-h-52 relative bg-muted/50">
                <div className="absolute top-0 -translate-y-1/2 right-4">
                  <span
                    style={{ background: teamspace.gradient }}
                    className="text-3xl uppercase font-bold min-w-16 min-h-16 flex items-center justify-center rounded-xl text-inverted border-[5px] border-inverted"
                  >
                    {teamspace.name.charAt(0)}
                  </span>
                </div>

                <div>
                  <h2 className="font-bold md:text-xl">{teamspace.name}</h2>
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
