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
  CheckIcon,
  XIcon,
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
  setPresentingDocument: (
    document_id: string,
    semantic_identifier: string
  ) => void;
}

export function FolderContents({
  setPresentingDocument,
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
  const [editingFile, setEditingFile] = useState<{
    id: number;
    name: string;
  } | null>(null);

  const handleMove = (destinationFolderId: number) => {
    if (fileToMove) {
      onMoveItem(fileToMove.id, destinationFolderId);
      setIsMoveModalOpen(false);
      setFileToMove(null);
    }
  };

  const handleRename = (fileId: number, newName: string) => {
    // Implement the rename logic here
    console.log(`Renaming file ${fileId} to ${newName}`);
    // You should update the file name in your state or make an API call here
    setEditingFile(null);
  };

  return (
    <div>
      {contents.children.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          onFolderClick={onFolderClick}
          onDeleteItem={onDeleteItem}
        />
      ))}
      {contents.files.map((file) => (
        <FileItem
          setPresentingDocument={setPresentingDocument}
          key={file.id}
          file={file}
          onDeleteItem={onDeleteItem}
          onDownloadItem={onDownloadItem}
          setFileToMove={setFileToMove}
          setIsMoveModalOpen={setIsMoveModalOpen}
          editingFile={editingFile}
          setEditingFile={setEditingFile}
          handleRename={handleRename}
        />
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

interface FolderItemProps {
  folder: { name: string; id: number };
  onFolderClick: (folderId: number) => void;
  onDeleteItem: (itemId: number, isFolder: boolean) => void;
}

function FolderItem({ folder, onFolderClick, onDeleteItem }: FolderItemProps) {
  return (
    <div
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
  );
}

interface FileItemProps {
  file: { name: string; id: number; document_id: string };
  onDeleteItem: (itemId: number, isFolder: boolean) => void;
  onDownloadItem: (documentId: string) => void;
  setFileToMove: React.Dispatch<
    React.SetStateAction<{ id: number; name: string } | null>
  >;
  setIsMoveModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  editingFile: { id: number; name: string } | null;
  setEditingFile: React.Dispatch<
    React.SetStateAction<{ id: number; name: string } | null>
  >;
  setPresentingDocument: (
    document_id: string,
    semantic_identifier: string
  ) => void;
  handleRename: (fileId: number, newName: string) => void;
}

function FileItem({
  setPresentingDocument,
  file,
  onDeleteItem,
  onDownloadItem,
  setFileToMove,
  setIsMoveModalOpen,
  editingFile,
  setEditingFile,
  handleRename,
}: FileItemProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [newFileName, setNewFileName] = useState(file.name);
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

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsPopoverOpen(true);
  };

  const handleMoveFile = () => {
    setFileToMove({ id: file.id, name: file.name });
    setIsMoveModalOpen(true);
    setIsPopoverOpen(false);
  };

  const startEditing = () => {
    setEditingFile({ id: file.id, name: file.name });
    setNewFileName(file.name);
    setIsPopoverOpen(false);
  };

  const cancelEditing = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFile(null);
    setNewFileName(file.name);
  };

  const submitRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    handleRename(file.id, newFileName);
  };

  return (
    <div
      key={file.id}
      className="flex items-center w-full justify-between p-2 hover:bg-gray-100"
      onContextMenu={handleDoubleClick}
    >
      <button
        onClick={() => setPresentingDocument(file.document_id, file.name)}
        className="flex items-center flex-grow"
      >
        <FileIcon className="mr-2" />
        {editingFile && editingFile.id === file.id ? (
          <div className="flex items-center">
            <input
              onClick={(e) => e.stopPropagation()}
              type="text"
              value={newFileName}
              onChange={(e) => {
                e.stopPropagation();
                setNewFileName(e.target.value);
              }}
              className="border rounded px-2 py-1 mr-2"
              autoFocus
            />
            <button
              onClick={submitRename}
              className="text-green-500 hover:text-green-700 mr-2"
            >
              <CheckIcon className="h-4 w-4" />
            </button>
            <button
              onClick={cancelEditing}
              className="text-red-500 hover:text-red-700"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <span>{file.name}</span>
        )}
      </button>

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
                  onClick={startEditing}
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
                  text="Delete"
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
}

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
