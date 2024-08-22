import { ChatSession } from "../interfaces";
import { groupSessionsByDateRange } from "../lib";
import { ChatSessionDisplay } from "./ChatSessionDisplay";
import { removeChatFromFolder } from "../folders/FolderManagement";
import { FolderList } from "../folders/FolderList";
import { Folder } from "../folders/interfaces";
import { CHAT_SESSION_ID_KEY, FOLDER_ID_KEY } from "@/lib/drag/constants";
import { usePopup } from "@/components/admin/connectors/Popup";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ChatTab({
  existingChats,
  currentChatId,
  folders,
  openedFolders,
  toggleSideBar,
}: {
  existingChats: ChatSession[];
  currentChatId?: number;
  folders: Folder[];
  openedFolders: { [key: number]: boolean };
  toggleSideBar?: () => void;
}) {
  const groupedChatSessions = groupSessionsByDateRange(existingChats);
  const { setPopup } = usePopup();
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleDropToRemoveFromFolder = async (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setIsDragOver(false); // Reset drag over state on drop
    const chatSessionId = parseInt(
      event.dataTransfer.getData(CHAT_SESSION_ID_KEY),
      10
    );
    const folderId = event.dataTransfer.getData(FOLDER_ID_KEY);

    if (folderId) {
      try {
        await removeChatFromFolder(parseInt(folderId, 10), chatSessionId);
        router.refresh(); // Refresh the page to reflect the changes
      } catch (error) {
        setPopup({
          message: "Failed to remove chat from folder",
          type: "error",
        });
      }
    }
  };

  return (
    <div className="mb-1 px-4 transition-all ease-in-out">
      {folders.length > 0 && (
        <div className="py-2 border-b border-border">
          <div className="text-xs text-subtle flex pb-0.5 mb-1.5 mt-2 font-medium">
            Folders
          </div>
          <FolderList
            folders={folders}
            currentChatId={currentChatId}
            openedFolders={openedFolders}
          />
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
                <div
                  key={dateRange}
                  className={`pb-2 ${
                    dateRange !== "Previous 30 Days" ? "border-b" : ""
                  }`}
                >
                  <div className="text-sm text-dark-900 flex pb-0.5 mb-1.5 mt-5 font-semibold">
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
                          />
                        </div>
                      );
                    })}
                </div>
              );
            }
          }
        )}
      </div>
    </div>
  );
}
