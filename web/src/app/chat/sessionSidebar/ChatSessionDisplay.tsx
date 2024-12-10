"use client";

import { useRouter } from "next/navigation";
import { ChatSession } from "../interfaces";
import { useState, useEffect, useContext } from "react";
import { getChatRetentionInfo, renameChatSession } from "../lib";
import Link from "next/link";
import {
  FiCheck,
  FiEdit2,
  FiMoreHorizontal,
  FiShare2,
  FiTrash,
  FiX,
} from "react-icons/fi";
import { DefaultDropdownElement } from "@/components/Dropdown";
import { Popover } from "@/components/popover/Popover";
import { ShareChatSessionModal } from "../modal/ShareChatSessionModal";
import { CHAT_SESSION_ID_KEY, FOLDER_ID_KEY } from "@/lib/drag/constants";
import { SettingsContext } from "@/components/settings/SettingsProvider";
import { WarningCircle } from "@phosphor-icons/react";
import { CustomTooltip } from "@/components/tooltip/CustomTooltip";

export function ChatSessionDisplay({
  chatSession,
  search,
  isSelected,
  skipGradient,
  closeSidebar,
  showShareModal,
  showDeleteModal,
}: {
  chatSession: ChatSession;
  isSelected: boolean;
  search?: boolean;
  skipGradient?: boolean;
  closeSidebar?: () => void;
  showShareModal?: (chatSession: ChatSession) => void;
  showDeleteModal?: (chatSession: ChatSession) => void;
}) {
  const router = useRouter();
  const [isHovering, setIsHovering] = useState(false);
  const [isRenamingChat, setIsRenamingChat] = useState(false);
  const [isMoreOptionsDropdownOpen, setIsMoreOptionsDropdownOpen] =
    useState(false);
  const [isShareModalVisible, setIsShareModalVisible] = useState(false);
  const [chatName, setChatName] = useState(chatSession.name);
  const [delayedSkipGradient, setDelayedSkipGradient] = useState(skipGradient);
  const settings = useContext(SettingsContext);

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

  if (!settings) {
    return null;
  }

  const { daysUntilExpiration, showRetentionWarning } = getChatRetentionInfo(
    chatSession,
    settings?.settings
  );

  return (
    <>
      {isShareModalVisible && (
        <ShareChatSessionModal
          chatSessionId={chatSession.id}
          existingSharedStatus={chatSession.shared_status}
          onClose={() => setIsShareModalVisible(false)}
        />
      )}

      <Link
        className={`flex my-1 group relative font-['KH Teka TRIAL'] ${
          isSelected
            ? "bg-[#e6e3dd] rounded"
            : "hover:bg-[#e6e3dd] hover:rounded"
        } transition-all duration-150`}
        key={chatSession.id}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
          setIsMoreOptionsDropdownOpen(false);
          setIsHovering(false);
        }}
        onClick={() => {
          if (settings?.isMobile && closeSidebar) {
            closeSidebar();
          }
        }}
        href={
          search
            ? `/search?searchId=${chatSession.id}`
            : `/chat?chatId=${chatSession.id}`
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
      >
        <div className="flex items-center w-full p-1">
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
              className="px-1 mr-1 w-full rounded text-base font-normal leading-normal text-black border border-[#dcdad4]"
            />
          ) : (
            <div className="flex-1 text-base font-normal text-black break-all whitespace-nowrap overflow-hidden mr-3">
              {chatName || `Chat ${chatSession.id}`}
            </div>
          )}

          {isHovering && (
            <div className="flex items-center ml-auto">
              {isRenamingChat ? (
                <>
                  <div
                    onClick={onRename}
                    className="hover:bg-black/10 p-1 rounded cursor-pointer"
                  >
                    <FiCheck size={16} />
                  </div>
                  <div
                    onClick={() => {
                      setChatName(chatSession.name);
                      setIsRenamingChat(false);
                    }}
                    className="hover:bg-black/10 p-1 rounded ml-2 cursor-pointer"
                  >
                    <FiX size={16} />
                  </div>
                </>
              ) : (
                <>
                  {!showShareModal && showRetentionWarning && (
                    <CustomTooltip
                      line
                      content={
                        <p>
                          This chat will expire{" "}
                          {daysUntilExpiration < 1
                            ? "today"
                            : `in ${daysUntilExpiration} day${
                                daysUntilExpiration !== 1 ? "s" : ""
                              }`}
                        </p>
                      }
                    >
                      <div className="mr-1 hover:bg-black/10 p-1 rounded cursor-pointer">
                        <WarningCircle className="text-warning" size={16} />
                      </div>
                    </CustomTooltip>
                  )}

                  {search ? (
                    showDeleteModal && (
                      <div
                        onClick={(e) => {
                          e.preventDefault();
                          showDeleteModal(chatSession);
                        }}
                        className="p-1 rounded ml-1 cursor-pointer hover:bg-black/10"
                      >
                        <FiTrash size={16} />
                      </div>
                    )
                  ) : (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMoreOptionsDropdownOpen(
                          !isMoreOptionsDropdownOpen
                        );
                      }}
                      className="-my-1 cursor-pointer"
                    >
                      <Popover
                        open={isMoreOptionsDropdownOpen}
                        onOpenChange={(open: boolean) =>
                          setIsMoreOptionsDropdownOpen(open)
                        }
                        content={
                          <div className="p-1 rounded">
                            <FiMoreHorizontal size={16} />
                          </div>
                        }
                        popover={
                          <div className="border border-[#dcdad4] rounded-lg bg-white z-50 w-32 shadow-lg">
                            {showShareModal && (
                              <DefaultDropdownElement
                                name="Share"
                                icon={FiShare2}
                                onSelect={() => showShareModal(chatSession)}
                              />
                            )}
                            {!search && (
                              <DefaultDropdownElement
                                name="Rename"
                                icon={FiEdit2}
                                onSelect={() => setIsRenamingChat(true)}
                              />
                            )}
                            {showDeleteModal && (
                              <DefaultDropdownElement
                                name="Delete"
                                icon={FiTrash}
                                onSelect={() => showDeleteModal(chatSession)}
                              />
                            )}
                          </div>
                        }
                        requiresContentPadding
                        sideOffset={6}
                        triggerMaxWidth
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </Link>
    </>
  );
}
