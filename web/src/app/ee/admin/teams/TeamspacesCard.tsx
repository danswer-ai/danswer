import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Teamspace } from "@/lib/types";
import { Cpu, File, Shield, Users } from "lucide-react";

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
              className="overflow-hidden !rounded-xl cursor-pointer xl:min-w-[280px] md:max-w-[400px] justify-start items-start"
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
                    <span className="inline">{teamspace.name}</span>
                    <div
                      className={`inline-block ml-2 w-2.5 h-2.5 rounded-full ${
                        teamspace.is_up_to_date ? "bg-success" : "bg-secondary"
                      }`}
                    />
                  </h2>
                  <span className="text-sm text-subtle">@mrquilbot</span>
                </div>

                <div className="w-full grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] text-sm gap-y-2 gap-x-6 font-light">
                  <div className="flex items-center gap-2">
                    <Users size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">
                      {teamspace.users.length} People
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Cpu size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">
                      {teamspace.assistants.length} Assistant
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <File size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">
                      {teamspace.document_sets.length} Document Set
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Shield size={16} className="shrink-0" />
                    <span className="whitespace-nowrap">1 Token Rate</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
    </>
  );
};
