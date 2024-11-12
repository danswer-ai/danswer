import { ChatSession } from "../interfaces";
import { groupSessionsByDateRange } from "../lib";
import { Separator } from "@/components/ui/separator";
import { SearchSessionDisplay } from "./SearchSessionDisplay";

export function SearchTab({
  existingChats,
  currentChatId,
  toggleSideBar,
  teamspaceId,
}: {
  existingChats: ChatSession[];
  currentChatId?: number;
  toggleSideBar?: () => void;
  teamspaceId?: string;
}) {
  const groupedChatSessions = groupSessionsByDateRange(existingChats);

  return (
    <div className="mb-1 px-4 transition-all ease-in-out">
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
    </div>
  );
}
