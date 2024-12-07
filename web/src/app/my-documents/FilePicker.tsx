import React, { useState, useEffect } from "react";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
// import { fetchFileSystem } from "../lib/file_system";
import { Modal } from "@/components/Modal";
// import { Modal } from "@/components/ui/modal";

interface UserFolder {
  id: number;
  name: string;
  parent_id: number | null;
}
interface UserFile {
  id: number;
  name: string;
  parent_folder_id: number | null;
}
interface FileSystem {
  folders: UserFolder[];
  files: UserFile[];
}

interface FilePickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (selectedItems: string[]) => void;
  onDelete: (selectedItems: string[]) => void;
}

export const FilePicker: React.FC<FilePickerProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
}) => {
  const [fileSystem, setFileSystem] = useState<FileSystem>({
    folders: [],
    files: [],
  });
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const fetchFileSystem = async () => {
    const response = await fetch("/api/user/file-system");
    const data = await response.json();
    return data;
  };

  useEffect(() => {
    const loadFileSystem = async () => {
      const data = await fetchFileSystem();
      setFileSystem(data);
    };
    loadFileSystem();
  }, []);

  const getCurrentDirectory = (): UserFolder[] => {
    let current = fileSystem.folders;
    // for (const dir of currentPath) {
    //   current = current.find((item) => item.name === dir)?.children || [];
    // }
    // console.log("current");
    // console.log(current);
    return current || [];
  };

  const handleItemClick = (item: UserFolder | UserFile) => {
    // if (item.parent_id === null) {
    //   setCurrentPath([...currentPath, item.name]);
    // }
    console.log(item);
  };

  const handleBackClick = () => {
    setCurrentPath(currentPath.slice(0, -1));
  };

  const handleItemSelect = (item: UserFolder | UserFile) => {
    const path = [...currentPath, item.name].join("/");
    setSelectedItems((prev) =>
      prev.includes(path) ? prev.filter((i) => i !== path) : [...prev, path]
    );
  };

  const handleSave = () => {
    onSave(selectedItems);
    onClose();
  };

  const handleDelete = () => {
    onDelete(selectedItems);
    onClose();
  };

  return (
    <Modal onOutsideClick={onClose} title="File Picker">
      <div className="p-4">
        <div className="mb-4">
          <Button onClick={handleBackClick} disabled={currentPath.length === 0}>
            Back
          </Button>
          <span className="ml-2">{currentPath.join(" / ") || "Root"}</span>
        </div>
        <div className="max-h-96 overflow-y-auto">
          {getCurrentDirectory().map((item) => (
            <div
              key={item.name}
              className="flex items-center p-2 hover:bg-gray-100"
            >
              <Checkbox
                checked={selectedItems.includes(
                  [...currentPath, item.name].join("/")
                )}
                onChange={() => handleItemSelect(item)}
              />
              <span
                className="ml-2 cursor-pointer"
                onClick={() => handleItemClick(item)}
              >
                {item.parent_id === null ? "📁 " : "📄 "}
                {item.name}
              </span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-end space-x-2">
          <Button onClick={handleDelete} variant="destructive">
            Delete Selected
          </Button>
          <Button onClick={handleSave} variant="default">
            Save Context
          </Button>
        </div>
      </div>
    </Modal>
  );
};
