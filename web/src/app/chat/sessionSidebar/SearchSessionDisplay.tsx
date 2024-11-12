"use client";

import { useRouter } from "next/navigation";
import { ChatSession } from "../interfaces";
import { useState, useEffect, useContext } from "react";
import {
  deleteChatSession,
  getChatRetentionInfo,
  renameChatSession,
} from "../lib";
import { BasicSelectable } from "@/components/BasicClickable";
import Link from "next/link";

import { ShareChatSessionModal } from "../modal/ShareChatSessionModal";
import { CHAT_SESSION_ID_KEY, FOLDER_ID_KEY } from "@/lib/drag/constants";
import {
  Ellipsis,
  X,
  Check,
  Pencil,
  MessageCircleMore,
  Trash,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { WarningCircle } from "@phosphor-icons/react";
import { useToast } from "@/hooks/use-toast";
import { useChatContext } from "@/context/ChatContext";
import { DeleteModal } from "@/components/DeleteModal";

export function SearchSessionDisplay({
  chatSession,
  search,
  isSelected,
  skipGradient,
  toggleSideBar,
  teamspaceId,
}: {
  chatSession: ChatSession;
  isSelected: boolean;
  search?: boolean;
  // needed when the parent is trying to apply some background effect
  // if not set, the gradient will still be applied and cause weirdness
  skipGradient?: boolean;
  toggleSideBar?: () => void;
  teamspaceId?: string;
}) {
  const router = useRouter();
  const combinedSettings = useContext(SettingsContext);
  const [chatName, setChatName] = useState(chatSession.name);
  const settings = useContext(SettingsContext);
  const { toast } = useToast();
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  if (!settings) {
    return <></>;
  }

  const { daysUntilExpiration, showRetentionWarning } = getChatRetentionInfo(
    chatSession,
    settings?.settings
  );

  return (
    <CustomTooltip
      trigger={
        <Link
          className="flex relative w-full"
          key={chatSession.id}
          href={
            teamspaceId
              ? `/t/${teamspaceId}/search?searchId=${chatSession.id}`
              : `/search?searchId=${chatSession.id}`
          }
          scroll={false}
          draggable="true"
          onDragStart={(event) => {
            event.dataTransfer.setData(
              CHAT_SESSION_ID_KEY,
              chatSession.id.toString()
            );
            event.dataTransfer.setData(
              FOLDER_ID_KEY,
              chatSession.folder_id?.toString() || ""
            );
          }}
          onClick={toggleSideBar}
        >
          <BasicSelectable fullWidth selected={isSelected}>
            <>
              <div className="flex relative items-center gap-2 w-full">
                <MessageCircleMore size={16} className="shrink-0" />
                <p className="mr-3 break-all truncate">
                  {chatName || `Chat ${chatSession.id}`}
                </p>
                {isSelected && (
                  <div className="ml-auto my-auto flex z-30 gap-1">
                    <div className="flex items-center">
                      {showRetentionWarning && (
                        <CustomTooltip
                          trigger={
                            <div className="mr-1 hover:bg-black/10 p-1 -m-1 rounded z-50">
                              <WarningCircle className="text-warning" />
                            </div>
                          }
                        >
                          <p>
                            This chat will expire{" "}
                            {daysUntilExpiration < 1
                              ? "today"
                              : `in ${daysUntilExpiration} day${daysUntilExpiration !== 1 ? "s" : ""}`}
                          </p>
                        </CustomTooltip>
                      )}
                    </div>

                    <div
                      className="hover:bg-background-inverted/10 p-1 rounded"
                      onClick={() => setOpenDeleteModal(true)}
                    >
                      <Trash size={16} />
                    </div>
                  </div>
                )}
              </div>
            </>
          </BasicSelectable>
        </Link>
      }
      side="right"
      asChild
      open={isPopoverOpen ? false : undefined}
    >
      {chatName || `Chat ${chatSession.id}`}
    </CustomTooltip>
  );
}
