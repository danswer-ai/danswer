import React from "react";
import { FolderIcon, FileIcon } from "lucide-react";

interface FolderContentsProps {
  contents: {
    children: { name: string; id: number }[];
    files: { name: string; id: number }[];
  };
  onFolderClick: (folderId: number) => void;
  currentFolder: number;
  onDeleteItem: (itemId: number, isFolder: boolean) => void;
}

export function FolderContents({
  contents,
  onFolderClick,
  currentFolder,
  onDeleteItem,
}: FolderContentsProps) {
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
            Delete
          </button>
        </div>
      ))}
      {contents.files.map((file) => (
        <div
          key={file.id}
          className="flex items-center justify-between p-2 hover:bg-gray-100"
        >
          <div className="flex items-center">
            <FileIcon className="mr-2" />
            <span>{file.name}</span>
          </div>
          <button
            onClick={() => onDeleteItem(file.id, false)}
            className="text-red-500 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}
