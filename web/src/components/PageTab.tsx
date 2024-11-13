import { CHAT_SESSION_ID_KEY, FOLDER_ID_KEY } from "@/lib/drag/constants";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useChatContext } from "@/context/ChatContext";
import { ChatSession } from "@/app/chat/interfaces";
import { Folder } from "@/app/chat/folders/interfaces";
import { groupSessionsByDateRange } from "@/app/chat/lib";
import { removeChatFromFolder } from "@/app/chat/folders/FolderManagement";
import { FolderList } from "@/app/chat/folders/FolderList";
import { ChatSessionDisplay } from "@/app/chat/sessionSidebar/ChatSessionDisplay";
import { SearchSessionDisplay } from "@/app/chat/sessionSidebar/SearchSessionDisplay";

export function PageTab({
  existingChats,
  currentChatId,
  folders,
  openedFolders,
  toggleSideBar,
  teamspaceId,
  chatSessionIdRef,
  isSearch,
}: {
  existingChats: ChatSession[];
  currentChatId?: number;
  folders?: Folder[];
  openedFolders?: { [key: number]: boolean };
  toggleSideBar?: () => void;
  teamspaceId?: string;
  chatSessionIdRef?: React.MutableRefObject<number | null>;
  isSearch?: boolean;
}) {
  const groupedChatSessions = groupSessionsByDateRange(existingChats);
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const { toast } = useToast();

  const chatContext = !isSearch ? useChatContext() : null;
  const refreshChatSessions = chatContext
    ? chatContext.refreshChatSessions
    : undefined;

  const handleDropToRemoveFromFolder = async (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setIsDragOver(false);

    const chatSessionId = event.dataTransfer.getData(CHAT_SESSION_ID_KEY);
    const folderId = event.dataTransfer.getData(FOLDER_ID_KEY);

    if (folderId && refreshChatSessions) {
      try {
        await removeChatFromFolder(parseInt(folderId, 10), chatSessionId);
        refreshChatSessions(teamspaceId);
        router.refresh();
      } catch (error) {
        toast({
          title: "Removal Failed",
          description:
            "Unable to remove the chat from the folder. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  return (
    <div className="mb-1 px-4 transition-all ease-in-out">
      {isSearch ? (
        <div className={`transition duration-300 ease-in-out rounded-xs`}>
          {Object.entries(groupedChatSessions).map(
            ([dateRange, chatSessions]) => {
              if (chatSessions.length > 0) {
                return (
                  <div key={dateRange} className={`pt-4`}>
                    <div className="px-4 text-sm text-dark-900 flex pb-2 font-semibold">
                      {dateRange}
                    </div>
                    {chatSessions
                      .filter((chat) => chat.folder_id === null)
                      .map((chat) => {
                        const isSelected = currentChatId === chat.id;
                        return (
                          <div key={`${chat.id}-${chat.name}`}>
                            <SearchSessionDisplay
                              chatSession={chat}
                              isSelected={isSelected}
                              toggleSideBar={toggleSideBar}
                              teamspaceId={teamspaceId}
                            />
                          </div>
                        );
                      })}
                    <Separator className="mt-3" />
                  </div>
                );
              }
            }
          )}
        </div>
      ) : (
        <>
          {folders && folders.length > 0 && (
            <div>
              <div className="px-4 text-sm text-dark-900 flex pb-2 pt-4 font-semibold">
                Folders
              </div>
              <FolderList
                folders={folders}
                currentChatId={currentChatId}
                openedFolders={openedFolders}
                chatSessionIdRef={chatSessionIdRef}
                teamspaceId={teamspaceId}
              />
              <Separator className="mt-3" />
            </div>
          )}

          <div
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragOver(true);
            }}
            onDragLeave={() => setIsDragOver(false)}
            onDrop={handleDropToRemoveFromFolder}
            className={`transition duration-300 ease-in-out ${
              isDragOver ? "bg-hover" : ""
            } rounded-xs`}
          >
            {Object.entries(groupedChatSessions).map(
              ([dateRange, chatSessions]) => {
                if (chatSessions.length > 0) {
                  return (
                    <div key={dateRange} className={`pt-4`}>
                      <div className="px-4 text-sm text-dark-900 flex pb-2 font-semibold">
                        {dateRange}
                      </div>
                      {chatSessions
                        .filter((chat) => chat.folder_id === null)
                        .map((chat) => {
                          const isSelected = currentChatId === chat.id;
                          return (
                            <div key={`${chat.id}-${chat.name}`}>
                              <ChatSessionDisplay
                                chatSession={chat}
                                isSelected={isSelected}
                                skipGradient={isDragOver}
                                toggleSideBar={toggleSideBar}
                                teamspaceId={teamspaceId}
                                chatSessionIdRef={chatSessionIdRef}
                              />
                            </div>
                          );
                        })}
                      <Separator className="mt-3" />
                    </div>
                  );
                }
              }
            )}
          </div>
        </>
      )}
    </div>
  );
}
