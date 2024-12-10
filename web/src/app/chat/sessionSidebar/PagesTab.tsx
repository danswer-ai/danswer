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
import { pageType } from "./types";

export function PagesTab({
  page,
  existingChats,
  currentChatId,
  folders,
  openedFolders,
  closeSidebar,
  newFolderId,
  showShareModal,
  showDeleteModal,
}: {
  page: pageType;
  existingChats?: ChatSession[];
  currentChatId?: string;
  folders?: Folder[];
  openedFolders?: { [key: number]: boolean };
  closeSidebar?: () => void;
  newFolderId: number | null;
  showShareModal?: (chatSession: ChatSession) => void;
  showDeleteModal?: (chatSession: ChatSession) => void;
}) {
  const groupedChatSessions = existingChats
    ? groupSessionsByDateRange(existingChats)
    : [];
  const { setPopup } = usePopup();
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const handleDropToRemoveFromFolder = async (
    event: React.DragEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    setIsDragOver(false);
    const chatSessionId = event.dataTransfer.getData(CHAT_SESSION_ID_KEY);
    const folderId = event.dataTransfer.getData(FOLDER_ID_KEY);

    if (folderId) {
      try {
        await removeChatFromFolder(parseInt(folderId, 10), chatSessionId);
        router.refresh();
      } catch (error) {
        setPopup({
          message: "Failed to remove chat from folder",
          type: "error",
        });
      }
    }
  };

  const isHistoryEmpty = !existingChats || existingChats.length === 0;

  return (
    <div
      className="mb-1 ml-3 relative overflow-y-auto h-full pr-3 font-['KH Teka TRIAL'] text-black"
      style={{ scrollbarGutter: "stable" }}
    >
      {folders && folders.length > 0 && (
        <div className="py-2 border-b border-[#dcdad4]">
          <div className="text-xs text-[#6c6c6c] font-medium mb-1.5 mt-2">
            Chat Folders
          </div>
          <FolderList
            newFolderId={newFolderId}
            folders={folders}
            currentChatId={currentChatId}
            openedFolders={openedFolders}
            showShareModal={showShareModal}
            showDeleteModal={showDeleteModal}
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
        className={`pt-3 pb-40 transition duration-300 ease-in-out ${
          isDragOver ? "bg-[#e6e3dd] rounded-md" : ""
        }`}
      >
        {(page === "chat" || page === "search") && (
          <p className="my-2 text-xs text-[#6c6c6c] font-medium">
            {page === "chat" ? "Chat History" : "Search History"}
          </p>
        )}
        {isHistoryEmpty ? (
          <p className="text-sm mt-2 w-[250px] text-[#6c6c6c] font-normal">
            {page === "search"
              ? "Try running a search! Your search history will appear here."
              : "Try sending a message! Your chat history will appear here."}
          </p>
        ) : (
          Object.entries(groupedChatSessions).map(
            ([dateRange, chatSessions], ind) => {
              const filteredSessions = chatSessions.filter(
                (chat) => chat.folder_id === null
              );
              if (filteredSessions.length > 0) {
                return (
                  <div key={dateRange} className={`${ind !== 0 ? "mt-5" : ""}`}>
                    <div className="text-xs text-[#6c6c6c] font-medium mb-1.5">
                      {dateRange}
                    </div>
                    {filteredSessions.map((chat) => {
                      const isSelected = currentChatId === chat.id;
                      return (
                        <div key={`${chat.id}-${chat.name}`}>
                          <ChatSessionDisplay
                            showDeleteModal={showDeleteModal}
                            showShareModal={showShareModal}
                            closeSidebar={closeSidebar}
                            search={page === "search"}
                            chatSession={chat}
                            isSelected={isSelected}
                            skipGradient={isDragOver}
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              }
            }
          )
        )}
      </div>
    </div>
  );
}
