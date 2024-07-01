import { User } from "@/lib/types";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import { UserDropdown } from "../UserDropdown";
import { FiShare2 } from "react-icons/fi";
import { SetStateAction } from "react";
import { Logo } from "../Logo";
import { PlusCircleIcon } from "../icons/icons";
import { NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA } from "@/lib/constants";
import { ChatSession } from "@/app/chat/interfaces";

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
  return (
    <div className="pb-6 left-0 sticky top-0 z-10 w-full relative flex">
      {/* // <div className="pb-6 left-0 sticky -top-[.1]  z-10 w-full from-neutral-200 via-neutral-200 to-neutral-200/10  flex  z-10 bg-gradient-to-b via-50% blur"> */}

      <div className="mt-2 mx-4 text-neutral-700 flex w-full">
        <div className=" absolute  z-[1000000] my-auto flex items-center text-xl font-bold font-['Poppins']">
          <Logo />
          {/* Danswer */}
          <a
            href={
              `/${page}` +
              (NEXT_PUBLIC_NEW_CHAT_DIRECTS_TO_SAME_PERSONA &&
              currentChatSession
                ? `?assistantId=${currentChatSession.persona_id}`
                : "")
            }
          >
            <PlusCircleIcon className="ml-2 my-auto !h-6 !w-6 cursor-pointer text-neutral-700 hover:text-neutral-600 transition-colors duration-300" />
          </a>
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
      <div className="h-24  left-0 absolute top-0 z-10 w-full bg-gradient-to-b via-50% z-[-1]  from-neutral-100 via-neutral-100 to-neutral-200/10 flex" />
    </div>
  );
}
