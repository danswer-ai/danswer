import { User } from "@/lib/types";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import { UserDropdown } from "../UserDropdown";
import { FiShare2, FiSidebar } from "react-icons/fi";
import { SetStateAction, useEffect } from "react";
import { Logo } from "../Logo";
import { ChatIcon, NewChatIcon, PlusCircleIcon } from "../icons/icons";
import { NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA } from "@/lib/constants";
import { ChatSession } from "@/app/chat/interfaces";
import { HeaderTitle } from "../header/Header";
import { Tooltip } from "../tooltip/Tooltip";

export default function FunctionalHeader({
  showSidebar,
  user,
  page,
  currentChatSession,
  setSharingModalVisible,
}: {
  page: "search" | "chat";
  showSidebar: boolean;
  user: User | null;
  currentChatSession?: ChatSession | null | undefined;
  setSharingModalVisible?: (value: SetStateAction<boolean>) => void;
}) {
  const isMac = navigator.userAgent.indexOf("Mac") !== -1;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      console.log("Key is down");
      if (event.metaKey || event.ctrlKey) {
        switch (event.key.toLowerCase()) {
          case "u":
            event.preventDefault();
            window.open(
              `/${page}` +
                (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
                currentChatSession
                  ? `?assistantId=${currentChatSession.persona_id}`
                  : ""),
              "_self"
            );
            break;
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);
  return (
    <div className="pb-6 left-0 sticky top-0 z-10 w-full relative flex">
      {/* // <div className="pb-6 left-0 sticky -top-[.1]  z-10 w-full from-neutral-200 via-neutral-200 to-neutral-200/10  flex  z-10 bg-gradient-to-b via-50% blur"> */}

      <div className="mt-2 mx-4 text-solid flex w-full">
        <div className=" absolute  z-[100] my-auto flex items-center text-xl font-bold ">
          <FiSidebar className="!h-5 !w-5" />
          {/* <Logo /> */}

          <div className="ml-2 text-solid text-xl">
            <HeaderTitle>Danswer</HeaderTitle>
          </div>

          {page == "chat" && (
            <Tooltip delayDuration={1000} content={`${isMac ? "⌘" : "⊞"}U`}>
              <a
                href={
                  `/${page}` +
                  (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
                  currentChatSession
                    ? `?assistantId=${currentChatSession.persona_id}`
                    : "")
                }
              >
                <NewChatIcon className="ml-2 my-auto !h-5 !w-5 cursor-pointer text-solid hover:text-dark transition-colors duration-300" />
                {/* <PlusCircleIcon className="ml-2 my-auto !h-6 !w-6 cursor-pointer text-solid hover:text-dark transition-colors duration-300" /> */}
              </a>
            </Tooltip>
          )}
        </div>

        <div className="ml-auto my-auto flex gap-x-2">
          {setSharingModalVisible && (
            <div
              onClick={() => setSharingModalVisible(true)}
              className="my-auto rounded cursor-pointer hover:bg-hover-light"
            >
              <FiShare2 size="18" />
            </div>
          )}

          <div className="flex   my-auto">
            <UserDropdown user={user} />
          </div>
        </div>
      </div>

      <div className="h-24 left-0 absolute top-0 z-10 w-full bg-gradient-to-b via-50% z-[-1] from-background via-background to-background/10 flex" />
    </div>
  );
}
