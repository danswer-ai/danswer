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
  closeSidebar,
  showShareModal,
  showDeleteModal,
}: {
  page: pageType;
  existingChats?: ChatSession[];
  currentChatId?: string;
  closeSidebar?: () => void;
  showShareModal?: (chatSession: ChatSession) => void;
  showDeleteModal?: (chatSession: ChatSession) => void;
}) {
  const groupedChatSessions = existingChats
    ? groupSessionsByDateRange(existingChats)
    : [];

  const { setPopup } = usePopup();
  const router = useRouter();
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const isHistoryEmpty = !existingChats || existingChats.length === 0;

  return (
    <div className="mb-1 text-text-sidebar ml-3 relative miniscroll mobile:pb-40 overflow-y-auto h-full">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        className={`pt-1 transition duration-300 ease-in-out mr-3 ${
          isDragOver ? "bg-hover" : ""
        } rounded-md`}
      >
        {(page == "chat" || page == "search") && (
          <p className="my-2 text-xs text-sidebar-subtle flex font-bold">
            {page == "chat" && "Chat "}
            {page == "search" && "Search "}
            History
          </p>
        )}
        {isHistoryEmpty ? (
          <p className="text-sm mt-2 w-[250px]">
            {page === "search"
              ? "Try running a search! Your search history will appear here."
              : "Try sending a message! Your chat history will appear here."}
          </p>
        ) : (
          Object.entries(groupedChatSessions).map(
            ([dateRange, chatSessions], ind) => {
              if (chatSessions.length > 0) {
                return (
                  <div key={dateRange}>
                    <div
                      className={`text-xs text-text-sidebar-subtle ${
                        ind != 0 && "mt-5"
                      } flex pb-0.5 mb-1.5 font-medium`}
                    >
                      {dateRange}
                    </div>
                    {chatSessions
                      .filter((chat) => chat.folder_id === null)
                      .map((chat) => {
                        const isSelected = currentChatId === chat.id;
                        return (
                          <div key={`${chat.id}-${chat.name}`}>
                            <ChatSessionDisplay
                              showDeleteModal={showDeleteModal}
                              showShareModal={showShareModal}
                              closeSidebar={closeSidebar}
                              search={page == "search"}
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
