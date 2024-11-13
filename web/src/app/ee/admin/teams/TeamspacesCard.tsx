"use client";

import { CustomTooltip } from "@/components/CustomTooltip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Teamspace } from "@/lib/types";
import { Cpu, EllipsisVertical, File, Shield, Users } from "lucide-react";
import { deleteTeamspace } from "./lib";
import { useToast } from "@/hooks/use-toast";
import { CustomModal } from "@/components/CustomModal";
import { useState } from "react";
import "../../../../components/loading.css";
import { buildImgUrl } from "@/app/chat/files/images/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const DeleteArchiveModal = ({
  trigger,
  onClose,
  open,
  type,
  onConfirm,
}: {
  trigger: JSX.Element | null;
  onClose: () => void;
  open: boolean;
  type: string;
  onConfirm: (event: any) => Promise<void>;
}) => {
  return (
    <CustomModal
      trigger={trigger}
      title={`Are you sure you want to ${type.toLowerCase()} this Teamspace?`}
      onClose={onClose}
      open={open}
      description={`You are about to ${type} this Team Space. Members will no longer have
        access to it, and it will be removed from their sidebar`}
    >
      <div className="flex justify-end w-full gap-2 pt-6">
        <Button onClick={onClose} variant="ghost">
          Cancel
        </Button>
        <Button onClick={onConfirm} variant="destructive">
          Confirm
        </Button>
      </div>
    </CustomModal>
  );
};

interface TeamspaceWithGradient extends Teamspace {
  gradient?: string;
}

interface TeamspacesCardProps {
  teamspace: TeamspaceWithGradient;
  refresh: () => void;
  onClick: (teamspaceId: number) => void;
}

export const TeamspacesCard = ({
  teamspace,
  refresh,
  onClick,
}: TeamspacesCardProps) => {
  const { toast } = useToast();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isArchiveModalOpen, setIsArchiveModalOpen] = useState(false);

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          className="absolute cursor-pointer top-3 right-3"
        >
          <EllipsisVertical stroke="#ffffff" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start">
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => setIsArchiveModalOpen(true)}>
              Archive
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsDeleteModalOpen(true)}>
              Delete
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {isArchiveModalOpen && (
        <DeleteArchiveModal
          trigger={null}
          onClose={() => setIsArchiveModalOpen(false)}
          open={isArchiveModalOpen}
          type="Archive"
          onConfirm={async () => {
            setIsArchiveModalOpen(false);
          }}
        />
      )}

      {isDeleteModalOpen && (
        <DeleteArchiveModal
          trigger={null}
          onClose={() => setIsDeleteModalOpen(false)}
          open={isDeleteModalOpen}
          type="Delete"
          onConfirm={async (event) => {
            event.stopPropagation();
            const response = await deleteTeamspace(teamspace.id);
            if (response.ok) {
              toast({
                title: "Teamspace Deleted!",
                description: `Successfully deleted the teamspace: "${teamspace.name}".`,
                variant: "success",
              });
            } else {
              const errorMsg = (await response.json()).detail;
              toast({
                title: "Deletion Error",
                description: `Failed to delete the teamspace: ${errorMsg}. Please try again.`,
                variant: "destructive",
              });
            }
            refresh();
          }}
        />
      )}

      <Card
        key={teamspace.id}
        className="overflow-hidden !rounded-xl cursor-pointer xl:min-w-[280px] md:max-w-[400px] justify-start items-start"
        onClick={() => onClick(teamspace.id)}
      >
        <CardHeader
          style={{ background: teamspace.gradient }}
          className="p-10"
        ></CardHeader>
        <CardContent className="relative flex flex-col justify-between min-h-48 bg-muted/50">
          <div className="absolute top-0 w-12 h-12 -translate-y-1/2 right-4 flex items-center justify-center">
            {teamspace.logo ? (
              <div className="rounded-md w-10 h-10 bg-background overflow-hidden">
                <img
                  src={buildImgUrl(teamspace.logo)}
                  alt="Teamspace Logo"
                  className="object-cover w-full h-full shrink-0"
                  width={40}
                  height={40}
                />
              </div>
            ) : (
              <span
                style={{ background: teamspace.gradient }}
                className="text-xl uppercase font-bold h-full flex items-center justify-center rounded-lg text-inverted border-[5px] border-inverted w-full"
              >
                {teamspace.name.charAt(0)}
              </span>
            )}
          </div>
          <div className="pb-6">
            <h2 className="w-full font-bold break-all whitespace-normal">
              <span className="inline">{teamspace.name}</span>
              <CustomTooltip
                trigger={
                  <div
                    className={`inline-block ml-2 w-2.5 h-2.5 rounded-full ${
                      teamspace.is_up_to_date
                        ? "bg-success-500"
                        : "bg-secondary-500 loading dots"
                    }`}
                  />
                }
              >
                {teamspace.is_up_to_date ? "Active" : "Syncing"}
              </CustomTooltip>
            </h2>
            <span className="text-sm text-subtle">
              {teamspace.creator.full_name}
            </span>
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
              <span className="whitespace-nowrap">
                {teamspace.cc_pairs.length} Data Source
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
