"use client";

import { CustomModal } from "@/components/CustomModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Teamspace } from "@/lib/types";
import { Copy, Plus } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Logo from "../../../../../public/logo.png";
import { Checkbox } from "@/components/ui/checkbox";

interface TeamspaceAssistantProps {
  teamspace: Teamspace & { gradient: string };
}

export const TeamspaceAssistant = ({ teamspace }: TeamspaceAssistantProps) => {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isAssistantModalOpen, setIsAssistantModalOpen] = useState(false);

  return (
    <div className="relative">
      <CustomModal
        trigger={
          <Button
            className="absolute top-4 right-4"
            onClick={() => setIsInviteModalOpen(true)}
          >
            <Plus size={16} /> Add
          </Button>
        }
        title="Add new assistant"
        description="Your invite link has been created. Share this link to join
            your workspace."
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
      >
        Add
      </CustomModal>
      <CustomModal
        trigger={
          <div
            className="rounded-md bg-muted w-full p-4 min-h-32 flex flex-col justify-between"
            onClick={() => setIsAssistantModalOpen(true)}
          >
            <h3>
              Assistant <span className="px-2 font-normal">|</span>{" "}
              {teamspace.assistants.length}
            </h3>
            {teamspace.assistants.length > 0 ? (
              <div className="pt-8 flex flex-wrap -space-x-3">
                {teamspace.assistants.slice(0, 8).map((teamspaceAssistant) => (
                  <div
                    key={teamspaceAssistant.id}
                    className={`bg-primary w-10 h-10 rounded-full flex items-center justify-center font-semibold text-inverted text-lg uppercase`}
                  >
                    {teamspaceAssistant.name!.charAt(0)}
                  </div>
                ))}
                {teamspace.assistants.length > 8 && (
                  <div className="bg-background w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold">
                    +{teamspace.assistants.length - 8}
                  </div>
                )}
              </div>
            ) : (
              <p>There are no asssitant.</p>
            )}
          </div>
        }
        title="Assistants"
        open={isAssistantModalOpen}
        onClose={() => setIsAssistantModalOpen(false)}
      >
        {teamspace.assistants.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {teamspace.assistants.map((assistant) => (
              <div key={assistant.id} className="border rounded-md flex">
                <div className="rounded-l-md flex items-center justify-center p-4 border-r">
                  <Image
                    src={Logo}
                    alt={assistant.name}
                    width={150}
                    height={150}
                  />
                </div>
                <div className="w-full p-4">
                  <div className="flex items-center justify-between w-full">
                    <h3>{assistant.name}</h3>
                    <Checkbox />
                  </div>
                  <p className="text-sm pt-2 line-clamp">
                    {assistant.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          "There are no assistants."
        )}
      </CustomModal>
    </div>
  );
};
