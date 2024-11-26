"use client";

import {
  BookText,
  CircleHelp,
  Command,
  MessageCircleReply,
} from "lucide-react";
import Link from "next/link";
import { CustomModal } from "./CustomModal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { useState } from "react";

export function HelperFab() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {isModalOpen && (
        <CustomModal
          trigger={null}
          title="Shortcut Keys"
          description="Quickly access common actions with these keyboard shortcuts."
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
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
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          asChild
          className="absolute bottom-5 right-5 md:bottom-3 md:right-3 lg:bottom-5 lg:right-5 z-modal hidden md:flex cursor-pointer"
        >
          <CircleHelp size={20} />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end">
          <DropdownMenuGroup>
            <DropdownMenuItem>
              <Link
                href="https://aitable.ai/share/shrTvVrDD0P7HqySRmlp8/fommkqn7v0WUqLGB43"
                target="_blank"
                className="flex items-center gap-2"
              >
                <MessageCircleReply size={16} /> Feedback Forms
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem disabled>
              <Link href="" target="_blank" className="flex items-center gap-2">
                <BookText size={16} /> User Guide & FAQ
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
              <Command size={16} /> Shortcut Keys
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
