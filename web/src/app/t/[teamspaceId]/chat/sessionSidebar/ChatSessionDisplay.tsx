"use client";

import { useParams, useRouter } from "next/navigation";
import { ChatSession } from "../interfaces";
import { useState, useEffect, useContext } from "react";
import { BasicSelectable } from "@/components/BasicClickable";
import Link from "next/link";

import { ShareChatSessionModal } from "../modal/ShareChatSessionModal";
import { CHAT_SESSION_ID_KEY, FOLDER_ID_KEY } from "@/lib/drag/constants";
import {
  Ellipsis,
  Share2,
  X,
  Check,
  Pencil,
  MessageCircleMore,
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
import { DeleteChatModal } from "@/components/modals/DeleteEntityModal";
import { useToast } from "@/hooks/use-toast";
import {
  deleteChatSession,
  getChatRetentionInfo,
  renameChatSession,
} from "@/app/chat/lib";

export function ChatSessionDisplay({
  chatSession,
  search,
  isSelected,
  skipGradient,
  toggleSideBar,
}: {
  chatSession: ChatSession;
  isSelected: boolean;
  search?: boolean;
  // needed when the parent is trying to apply some background effect
  // if not set, the gradient will still be applied and cause weirdness
  skipGradient?: boolean;
  toggleSideBar?: () => void;
}) {
  const { teamspaceId } = useParams();
  const router = useRouter();
  const combinedSettings = useContext(SettingsContext);
  const [isRenamingChat, setIsRenamingChat] = useState(false);
  const [chatName, setChatName] = useState(chatSession.name);
  const [delayedSkipGradient, setDelayedSkipGradient] = useState(skipGradient);
  const settings = useContext(SettingsContext);
  const { toast } = useToast();

  useEffect(() => {
    if (skipGradient) {
      setDelayedSkipGradient(true);
    } else {
      const timer = setTimeout(() => {
        setDelayedSkipGradient(skipGradient);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [skipGradient]);

  const onRename = async () => {
    const response = await renameChatSession(chatSession.id, chatName);
    if (response.ok) {
      setIsRenamingChat(false);
      router.refresh();
      toast({
        title: "Chat session renamed",
        description: "The chat session has been successfully renamed.",
        variant: "success",
      });
    } else {
      toast({
        title: "Failed to rename chat session",
        description: "There was an issue renaming the chat session.",
        variant: "destructive",
      });
    }
  };

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
          className="flex relative"
          key={chatSession.id}
          href={`/t/${teamspaceId}/chat?chatId=${chatSession.id}`}
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
                {isRenamingChat ? (
                  <input
                    value={chatName}
                    onChange={(e) => setChatName(e.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        onRename();
                        event.preventDefault();
                      }
                    }}
                    className="-my-px px-1 py-[1px] mr-2 w-full rounded"
                  />
                ) : (
                  <p className="mr-3 break-all truncate">
                    {chatName || `Chat ${chatSession.id}`}
                  </p>
                )}
                {isSelected &&
                  (isRenamingChat ? (
                    <div className="ml-auto my-auto flex">
                      <div
                        onClick={onRename}
                        className={`hover:bg-background-inverted/10 p-1 -m-1 rounded`}
                      >
                        <Check size={16} />
                      </div>
                      <div
                        onClick={() => {
                          setChatName(chatSession.name);
                          setIsRenamingChat(false);
                        }}
                        className={`hover:bg-background-inverted/10 p-1 -m-1 rounded ml-2`}
                      >
                        <X size={16} />
                      </div>
                    </div>
                  ) : (
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
                        <div className={"-m-1"}>
                          <CustomTooltip
                            trigger={
                              <Popover>
                                <PopoverTrigger asChild>
                                  <div className="hover:bg-background-inverted/10 p-1 rounded flex items-center justify-center">
                                    <Ellipsis size={16} />
                                  </div>
                                </PopoverTrigger>
                                <PopoverContent>
                                  <div className="flex flex-col w-full">
                                    {combinedSettings?.featureFlags
                                      .share_chat && (
                                      <ShareChatSessionModal
                                        chatSessionId={chatSession.id}
                                        existingSharedStatus={
                                          chatSession.shared_status
                                        }
                                        onPopover
                                      />
                                    )}
                                    <Button
                                      variant="ghost"
                                      onClick={() => setIsRenamingChat(true)}
                                      className="w-full hover:bg-primary hover:text-inverted"
                                    >
                                      <Pencil className="mr-2" size={16} />
                                      Rename
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            }
                            asChild
                          >
                            More
                          </CustomTooltip>
                        </div>
                      </div>

                      <CustomTooltip
                        trigger={
                          <DeleteChatModal
                            onSubmit={async () => {
                              const response = await deleteChatSession(
                                chatSession.id
                              );
                              if (response.ok) {
                                // go back to the main page
                                router.push(`/t/${teamspaceId}/chat`);
                                toast({
                                  title: "Chat session deleted",
                                  description:
                                    "The chat session has been successfully deleted.",
                                  variant: "success",
                                });
                              } else {
                                toast({
                                  title: "Failed to delete chat session",
                                  description:
                                    "There was an issue deleting the chat session.",
                                  variant: "destructive",
                                });
                              }
                            }}
                            chatSessionName={chatSession.name}
                          />
                        }
                        asChild
                      >
                        Delete
                      </CustomTooltip>
                    </div>
                  ))}
              </div>
              {isSelected && !isRenamingChat && !delayedSkipGradient && (
                <div className="absolute bottom-0 right-0 top-0 bg-gradient-to-l to-transparent from-hover w-20 from-60% rounded" />
              )}
            </>
          </BasicSelectable>
        </Link>
      }
      side="right"
      asChild
    >
      {chatName || `Chat ${chatSession.id}`}
    </CustomTooltip>
  );
}
