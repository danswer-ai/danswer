import React, { useEffect, useRef, useState } from "react";
import {
  FolderIcon,
  FileIcon,
  DownloadIcon,
  TrashIcon,
  PencilIcon,
  ClipboardPenLine,
  ShareIcon,
  InfoIcon,
} from "lucide-react";
import { Popover } from "@headlessui/react";
import { MoveFileModal } from "./MoveFileModal";

interface FolderContentsProps {
  contents: {
    children: { name: string; id: number }[];
    files: { name: string; id: number; document_id: string }[];
  };
  onFolderClick: (folderId: number) => void;
  currentFolder: number;
  onDeleteItem: (itemId: number, isFolder: boolean) => void;
  onDownloadItem: (documentId: string) => void;
  onMoveItem: (itemId: number, destinationFolderId: number) => void;
}

export function FolderContents({
  contents,
  onFolderClick,
  currentFolder,
  onDeleteItem,
  onDownloadItem,
  onMoveItem,
}: FolderContentsProps) {
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [fileToMove, setFileToMove] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const ContentDisplay = (file: {
    name: string;
    id: number;
    document_id: string;
  }) => {
    const [isPopoverOpen, setIsPopoverOpen] = useState(false);

    const handleDoubleClick = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsPopoverOpen(true);
    };
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          popoverRef.current &&
          !popoverRef.current.contains(event.target as Node)
        ) {
          setIsPopoverOpen(false);
        }
      };

      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    const handleMoveFile = () => {
      setFileToMove({ id: file.id, name: file.name });
      setIsMoveModalOpen(true);
      setIsPopoverOpen(false);
    };

    return (
      <div
        key={file.id}
        className="flex items-center justify-between p-2 hover:bg-gray-100"
        onContextMenu={handleDoubleClick}
      >
        <div className="flex items-center">
          <FileIcon className="mr-2" />
          <span>{file.name}</span>
        </div>

        <Popover ref={popoverRef} className="relative">
          {({ open }) => (
            <>
              <Popover.Button className="hidden">Open menu</Popover.Button>

              <Popover.Panel
                static
                className={`${
                  isPopoverOpen ? "block" : "hidden"
                } absolute right-0 z-10 mt-2 w-56 rounded-md bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none`}
              >
                <div className="py-1">
                  <PopoverItem
                    icon={<DownloadIcon />}
                    text="Download"
                    onClick={() => onDownloadItem(file.document_id)}
                    setIsPopoverOpen={setIsPopoverOpen}
                  />
                  <PopoverItem
                    icon={<PencilIcon />}
                    text="Rename"
                    onClick={() => {
                      /* Implement rename logic */
                    }}
                    setIsPopoverOpen={setIsPopoverOpen}
                  />
                  <PopoverItem
                    icon={<ClipboardPenLine />}
                    text="Make a copy"
                    onClick={() => {
                      /* Implement copy logic */
                    }}
                    setIsPopoverOpen={setIsPopoverOpen}
                  />
                  <PopoverItem
                    icon={<ShareIcon />}
                    text="Share"
                    onClick={() => {
                      /* Implement share logic */
                    }}
                    setIsPopoverOpen={setIsPopoverOpen}
                  />
                  <PopoverItem
                    icon={<FolderIcon />}
                    text="Organize"
                    onClick={handleMoveFile}
                    setIsPopoverOpen={setIsPopoverOpen}
                  />
                  <PopoverItem
                    icon={<InfoIcon />}
                    text="File information"
                    onClick={() => {
                      /* Implement file info logic */
                    }}
                    setIsPopoverOpen={setIsPopoverOpen}
                  />
                  <PopoverItem
                    icon={<TrashIcon />}
                    text="Move to trash"
                    onClick={() => onDeleteItem(file.id, false)}
                    setIsPopoverOpen={setIsPopoverOpen}
                  />
                </div>
              </Popover.Panel>
            </>
          )}
        </Popover>
      </div>
    );
  };

  const PopoverItem = ({ icon, text, onClick, setIsPopoverOpen }: any) => (
    <button
      className="flex select-none items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
      onClick={() => {
        onClick();
        setIsPopoverOpen(false);
      }}
    >
      {icon && <span className="mr-3 h-5 w-5">{icon}</span>}
      {text}
    </button>
  );

  const handleMove = (destinationFolderId: number) => {
    if (fileToMove) {
      onMoveItem(fileToMove.id, destinationFolderId);
      setIsMoveModalOpen(false);
      setFileToMove(null);
    }
  };

  return (
    <div>
      {contents.children.map((folder) => (
        <div
          key={folder.id}
          className="flex items-center justify-between p-2 hover:bg-gray-100 cursor-pointer"
          onClick={() => onFolderClick(folder.id)}
        >
          <div className="flex items-center">
            <FolderIcon className="mr-2" />
            <span>{folder.name}</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteItem(folder.id, true);
            }}
            className="text-red-500 hover:text-red-700"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      ))}
      {contents.files.map((file) => (
        <ContentDisplay key={file.id} {...file} />
      ))}
      {fileToMove && (
        <MoveFileModal
          isOpen={isMoveModalOpen}
          onClose={() => setIsMoveModalOpen(false)}
          onMove={handleMove}
          currentLocation={{ id: currentFolder, name: "Current Folder" }}
          fileName={fileToMove.name}
        />
      )}
    </div>
  );
}
