import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Upload, RefreshCw } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface FolderActionsProps {
  currentFolder: string;
  onRefresh: () => void;
  onCreateFolder: (folderName: string) => void;
  onUploadFiles: (files: FileList) => void;
}

export function FolderActions({
  currentFolder,
  onRefresh,
  onCreateFolder,
  onUploadFiles,
}: FolderActionsProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName("");
      setIsCreatingFolder(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      onUploadFiles(files);
    }
  };

  return (
    <div className="flex items-center space-x-2">
      <Button
        onClick={onRefresh}
        variant="outline"
        size="sm"
        className="border-gray-300 hover:bg-gray-100"
      >
        <RefreshCw className="h-4 w-4 text-gray-600" />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button
            onClick={() => setIsCreatingFolder(!isCreatingFolder)}
            variant="outline"
            size="sm"
            className="border-gray-300 hover:bg-gray-100"
          >
            <Plus className="h-4 w-4 text-gray-600" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 bg-white shadow-md rounded-md">
          {isCreatingFolder ? (
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="New folder name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full text-sm border border-gray-300 focus:border-gray-500 rounded"
              />
              <div className="flex justify-between space-x-2">
                <Button
                  onClick={handleCreateFolder}
                  size="sm"
                  className="bg-gray-800 hover:bg-gray-900 text-white text-xs"
                >
                  Create
                </Button>
                <Button
                  onClick={() => setIsCreatingFolder(false)}
                  variant="outline"
                  size="sm"
                  className="border border-gray-300 hover:bg-gray-100 text-xs"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-xs font-medium text-gray-700">New Folder</p>
          )}
        </PopoverContent>
      </Popover>

      <Button
        variant="outline"
        size="sm"
        className="border-gray-300 hover:bg-gray-100"
      >
        <Upload className="h-4 w-4 text-gray-600" />
      </Button>

      <input
        id="file-upload"
        type="file"
        multiple
        onChange={handleFileUpload}
        className="hidden"
      />
    </div>
  );
}
