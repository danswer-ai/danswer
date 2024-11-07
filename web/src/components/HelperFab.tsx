import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  BookText,
  CircleHelp,
  Command,
  MessageCircleReply,
} from "lucide-react";
import Link from "next/link";
import { CustomModal } from "./CustomModal";

export function HelperFab() {
  return (
    <Popover>
      <PopoverTrigger
        asChild
        className="absolute bottom-5 right-5 md:bottom-3 md:right-3 lg:bottom-5 lg:right-5 z-modal hidden md:flex cursor-pointer"
      >
        <CircleHelp size={20} />
      </PopoverTrigger>
      <PopoverContent className="w-56 text-sm" side="top" align="end">
        <Link
          href="https://aitable.ai/share/shrTvVrDD0P7HqySRmlp8/fommkqn7v0WUqLGB43"
          className="flex items-center gap-2 py-3 px-4 cursor-pointer rounded-regular hover:bg-brand-500 hover:text-inverted"
          target="_blank"
        >
          <MessageCircleReply size={16} /> Feedback Forms
        </Link>
        <Link
          href=""
          className="flex items-center gap-2 py-3 px-4 cursor-not-allowed rounded-regular hover:bg-brand-500 hover:text-inverted opacity-50 pointer-events-none"
          target="_blank"
        >
          <BookText size={16} /> User Guide & FAQ
        </Link>
        <CustomModal
          trigger={
            <div className="flex items-center gap-2 py-3 px-4 rounded-regular hover:bg-brand-500 hover:text-inverted">
              <Command size={16} /> Shortcut Keys
            </div>
          }
          title="Shortcut Keys"
        >
          <div className="grid grid-cols-2 gap-y-6 gap-x-20 pb-4">
            <div className="flex justify-between items-center">
              <span>Open chat page</span>
              <div className="flex items-center gap-2">
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  <Command size={14} className="shrink-0" />
                </span>
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  D
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Open search page</span>
              <div className="flex items-center gap-2">
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  <Command size={14} className="shrink-0" />
                </span>
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  S
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Open admin panel</span>
              <div className="flex items-center gap-2">
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  <Command size={14} className="shrink-0" />
                </span>
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  Q
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Open profile page</span>
              <div className="flex items-center gap-2">
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  <Command size={14} className="shrink-0" />
                </span>
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  P
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Start new chat</span>
              <div className="flex items-center gap-2">
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  <Command size={14} className="shrink-0" />
                </span>
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  K
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Create new folder</span>
              <div className="flex items-center gap-2">
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  <Command size={14} className="shrink-0" />
                </span>
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  I
                </span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span>Toggle the sidebar</span>
              <div className="flex items-center gap-2">
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  <Command size={14} className="shrink-0" />
                </span>
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  L
                </span>
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span>Toggle retrieve sources</span>
              <div className="flex items-center gap-2">
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  <Command size={14} className="shrink-0" />
                </span>
                <span className="border border-input w-10 h-10 p-5 flex items-center justify-center rounded-sm">
                  M
                </span>
              </div>
            </div>
          </div>
        </CustomModal>
      </PopoverContent>
    </Popover>
  );
}
