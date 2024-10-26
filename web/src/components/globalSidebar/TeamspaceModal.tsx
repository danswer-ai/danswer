"use client";

import { CustomTooltip } from "@/components/CustomTooltip";
import { Ellipsis } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CustomModal } from "../CustomModal";
import { useState } from "react";
import { MinimalTeamspaceSnapshot } from "@/lib/types";
import Link from "next/link";
import Image from "next/image";

interface TeamspaceModalProps {
  teamspace?: MinimalTeamspaceSnapshot[] | undefined;
  defaultPage: string;
}

export const TeamspaceModal = ({
  teamspace,
  defaultPage,
}: TeamspaceModalProps) => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  if (!teamspace) return null;

  const generateGradient = (teamspaceName: string) => {
    const colors = ["#f9a8d4", "#8b5cf6", "#34d399", "#60a5fa", "#f472b6"];
    const index = teamspaceName.charCodeAt(0) % colors.length;
    return `linear-gradient(135deg, ${colors[index]}, ${
      colors[(index + 1) % colors.length]
    })`;
  };

  return (
    <CustomModal
      trigger={
        <CustomTooltip
          trigger={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsModalVisible(true)}
            >
              <Ellipsis size={16} />
            </Button>
          }
          asChild
          side="right"
          delayDuration={0}
        >
          Show More
        </CustomTooltip>
      }
      onClose={() => setIsModalVisible(false)}
      open={isModalVisible}
      title="Your Team Space"
    >
      <div className="grid grid-cols-3 gap-4">
        {teamspace.map((team) => (
          <Link
            key={team.id}
            className="flex items-center gap-4 border rounded-md p-4 cursor-pointer"
            href={`/t/${team.id}/${defaultPage}`}
          >
            {team.is_custom_logo ? (
              <Image
                src={`/api/teamspace/logo?teamspace_id=${team.id}&t=${Date.now()}`}
                alt="Teamspace Logo"
                className="object-cover shrink-0 rounded-md w-10 h-10"
                width={40}
                height={40}
              />
            ) : (
              <div
                style={{ background: generateGradient(team.name) }}
                className="font-bold text-inverted w-10 h-10 shrink-0 rounded-md bg-primary flex justify-center items-center uppercase"
              >
                {team.name.charAt(0)}
              </div>
            )}
            <h3>{team.name}</h3>
          </Link>
        ))}
      </div>
    </CustomModal>
  );
};