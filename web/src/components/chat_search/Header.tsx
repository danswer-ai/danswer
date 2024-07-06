import { User } from "@/lib/types";
import { TbLayoutSidebarLeftExpand } from "react-icons/tb";
import { UserDropdown } from "../UserDropdown";
import { FiShare2 } from "react-icons/fi";
import { SetStateAction } from "react";
import { Logo } from "../Logo";
import { PlusCircle } from "@phosphor-icons/react";
import { PlusCircleIcon } from "../icons/icons";
import { useRouter } from "next/navigation";

export default function FunctionalHeader({
  showSidebar,
  user,
  page,
  setSharingModalVisible,
}: {
  page: "search" | "chat";
  showSidebar: boolean;
  user: User | null;
  setSharingModalVisible?: (value: SetStateAction<boolean>) => void;
}) {
  const router = useRouter();
  return (
    // <div className="pb-6 left-0 sticky top-0 z-10 w-full bg-gradient-to-b via-50% blur from-neutral-200 via-neutral-200 to-neutral-200/10 flex">
    <div className="pb-6 left-0 sticky top-0 z-10 w-full bg-opacity-30 backdrop-blur-sm flex">
      {/* // <div className="pb-6 left-0 sticky -top-[.1]  z-10 w-full from-neutral-200 via-neutral-200 to-neutral-200/10  flex  z-10 bg-gradient-to-b via-50% blur"> */}

      {/* pb-6 left-0 sticky top-0 z-10 w-full from-neutral-200 via-neutral-200 to-neutral-200/0 absolute flex  z-10 bg-gradient-to-b via-50% blur */}
      <div className="mt-2 text-neutral-700 flex w-full">
        {/* <Logo /> */}
        <div className=" absolute ml-4 z-[1000000] my-auto flex items-center text-xl font-bold font-['Poppins']">
          <Logo />
          {/* Danswer */}
          <button onClick={() => router.push(`/${page}`)}>
            <PlusCircleIcon className="ml-2 my-auto !h-6 !w-6 cursor-pointer text-neutral-700 hover:text-neutral-600 transition-colors duration-300" />
          </button>
        </div>

        {/* {!showSidebar && (
          <button className="ml-4 mt-auto" onClick={() => toggleSidebar()}>
            <TbLayoutSidebarLeftExpand size={24} />
          </button>
        )} */}

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
