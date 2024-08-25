"use client";

import { useRouter } from "next/navigation";
import { ChatSession } from "../interfaces";
import { useState, useEffect } from "react";
import { deleteChatSession, renameChatSession } from "../lib";
import { DeleteChatModal } from "../modal/DeleteChatModal";
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

export function ChatSessionDisplay({
  chatSession,
  isSelected,
  skipGradient,
  toggleSideBar,
}: {
  chatSession: ChatSession;
  isSelected: boolean;
  // needed when the parent is trying to apply some background effect
  // if not set, the gradient will still be applied and cause weirdness
  skipGradient?: boolean;
  toggleSideBar?: () => void;
}) {
  const router = useRouter();
  const [isDeletionModalVisible, setIsDeletionModalVisible] = useState(false);
  const [isRenamingChat, setIsRenamingChat] = useState(false);
  const [chatName, setChatName] = useState(chatSession.name);
  const [delayedSkipGradient, setDelayedSkipGradient] = useState(skipGradient);

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
    } else {
      alert("Failed to rename chat session");
    }
  };

  return (
    <>
      <Link
        className="flex my-1 relative"
        key={chatSession.id}
        href={`/chat?chatId=${chatSession.id}`}
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
              <MessageCircleMore size={16} />
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
                <p className="break-all overflow-hidden whitespace-nowrap mr-3 text-emphasis text-ellipsis">
                  {chatName || `Chat ${chatSession.id}`}
                </p>
              )}
              {isSelected &&
                (isRenamingChat ? (
                  <div className="ml-auto my-auto flex">
                    <div
                      onClick={onRename}
                      className={`hover:bg-black/10 p-1 -m-1 rounded`}
                    >
                      <Check size={16} />
                    </div>
                    <div
                      onClick={() => {
                        setChatName(chatSession.name);
                        setIsRenamingChat(false);
                      }}
                      className={`hover:bg-black/10 p-1 -m-1 rounded ml-2`}
                    >
                      <X size={16} />
                    </div>
                  </div>
                ) : (
                  <div className="ml-auto my-auto flex z-30 gap-1">
                    <div className="flex items-center">
                      <div className={"-m-1"}>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div className="hover:bg-black/10 p-1 rounded">
                              <Ellipsis size={16} />
                            </div>
                          </PopoverTrigger>
                          <PopoverContent>
                            <div className="flex flex-col w-full">
                              <ShareChatSessionModal
                                chatSessionId={chatSession.id}
                                existingSharedStatus={chatSession.shared_status}
                              >
                                <Button
                                  variant="ghost"
                                  className="w-full flex justify-start hover:bg-primary hover:text-white"
                                >
                                  <Share2 className="mr-2" size={16} />
                                  Share
                                </Button>
                              </ShareChatSessionModal>
                              <Button
                                variant="ghost"
                                onClick={() => setIsRenamingChat(true)}
                                className="w-full hover:bg-primary hover:text-white"
                              >
                                <Pencil className="mr-2" size={16} />
                                Rename
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <DeleteChatModal
                      onSubmit={async () => {
                        const response = await deleteChatSession(
                          chatSession.id
                        );
                        if (response.ok) {
                          setIsDeletionModalVisible(false);
                          // go back to the main page
                          router.push("/chat");
                        } else {
                          alert("Failed to delete chat session");
                        }
                      }}
                      chatSessionName={chatSession.name}
                    />
                  </div>
                ))}
            </div>
            {isSelected && !isRenamingChat && !delayedSkipGradient && (
              <div className="absolute bottom-0 right-0 top-0 bg-gradient-to-l to-transparent from-hover w-20 from-60% rounded" />
            )}
          </>
        </BasicSelectable>
      </Link>
    </>
  );
}
