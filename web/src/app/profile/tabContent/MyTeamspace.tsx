"use client";

import { useState } from "react";
import { buildImgUrl } from "@/app/chat/files/images/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useGradient } from "@/hooks/useGradient";
import { User } from "@/lib/types";
import { Users } from "lucide-react";
import Image from "next/image";
import { CustomModal } from "@/components/CustomModal";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

export default function MyTeamspace({ user }: { user: User | null }) {
  const router = useRouter();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTeamspace, setSelectedTeamspace] = useState<any>(null);

  const filteredTeamspaces = user?.groups?.filter((teamspace) =>
    teamspace.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const deleteTeamspace = async (teamspaceId: number) => {
    try {
      const response = await fetch(`/api/teamspace/leave/${teamspaceId}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      });

      setIsModalOpen(false);

      router.refresh();
      if (response.ok) {
        toast({
          title: "Teamspace Left",
          description: "You have successfully left the teamspace.",
          variant: "success",
        });
      } else {
        const errorData = await response.json();
        toast({
          title: "Failed to leave teamspace",
          description: `Error: ${errorData.detail}`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "An Error Occurred",
        description:
          "An unexpected error occurred while leaving the teamspace.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      <CustomModal
        trigger={null}
        title="Leave Team?"
        description={`Are you sure you want to leave the team '${selectedTeamspace?.name}'? This action cannot be undone.`} // Use selectedTeamspace
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      >
        <div className="flex gap-2 justify-end">
          <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              selectedTeamspace && deleteTeamspace(selectedTeamspace.id)
            }
          >
            Leave
          </Button>{" "}
        </div>
      </CustomModal>
      <div className="py-8">
        <h2 className="font-bold text-lg md:text-xl">Your Teamspaces</h2>
        <p className="text-sm">
          Manage and explore all the teamspaces you&apos;re part of. Search,
          view details, or leave a teamspace with ease.
        </p>

        <div className="flex flex-col gap-6 pt-8">
          <div className="relative w-1/2 ml-auto">
            <Input
              type="text"
              placeholder="Search Teamspace"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-10 flex-wrap">
            {filteredTeamspaces?.map((teamspace) => (
              <Card key={teamspace.id} className="w-[375px]">
                <CardContent>
                  <div>
                    <div className="flex justify-between gap-5 items-end">
                      <h3 className="text-2xl text-strong truncate">
                        {teamspace.name}
                      </h3>
                      <div className="relative w-20 h-20 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                        {teamspace.logo ? (
                          <Image
                            src={buildImgUrl(teamspace.logo)}
                            alt="Teamspace Logo"
                            className="object-cover w-full h-full"
                            width={40}
                            height={40}
                          />
                        ) : (
                          <div
                            style={{ background: useGradient(teamspace.name) }}
                            className="font-bold text-3xl text-inverted  bg-brand-500 flex justify-center items-center uppercase w-full h-full"
                          >
                            {teamspace.name.charAt(0)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="space-x-2 flex gap-2 items-center text-subtle">
                      <Users size={15} />
                      {teamspace.users ? teamspace.users.length : 0}
                    </div>
                    <div className="flex justify-end pt-8">
                      <Button
                        variant="destructive"
                        onClick={() => {
                          setSelectedTeamspace(teamspace);
                          setIsModalOpen(true);
                        }}
                      >
                        Leave
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
