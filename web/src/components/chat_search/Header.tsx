import { User } from "@/lib/types";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import { UserDropdown } from "../UserDropdown";
import { FiShare2 } from "react-icons/fi";
import { SetStateAction } from "react";

export default function FunctionalHeader({
  showSidebar,
  toggleSidebar,
  user,
  setSharingModalVisible,
}: {
  showSidebar: boolean;
  toggleSidebar: () => void;
  user: User | null;
  setSharingModalVisible?: (value: SetStateAction<boolean>) => void;
}) {
  return (
    <div className="pb-6 left-0 sticky top-0 z-10 w-full bg-opacity-30 backdrop-blur-sm flex">
      <div className="mt-2 flex w-full">
        {!showSidebar && (
          <button className="ml-4 mt-auto" onClick={() => toggleSidebar()}>
            <TbLayoutSidebarLeftExpand size={24} />
          </button>
        )}
        <div className="ml-auto my-auto mr-4 flex gap-x-2">
          {setSharingModalVisible && (
            <div
              onClick={() => setSharingModalVisible(true)}
              className="my-auto rounded cursor-pointer hover:bg-hover-light"
            >
              <FiShare2 size="18" />
            </div>
          )}

          <div className="flex mr-4  my-auto">
            <UserDropdown user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}
