import React, { useState, useEffect } from "react";
import { ChevronRight, Folder } from "lucide-react";

interface Folder {
  id: number;
  name: string;
}

interface MoveFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onMove: (destinationFolderId: number) => void;
  currentLocation: Folder;
  fileName: string;
}

export function MoveFileModal({
  isOpen,
  onClose,
  onMove,
  currentLocation,
  fileName,
}: MoveFileModalProps) {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null);

  useEffect(() => {
    // TODO: Implement fetching folders from the backend
    // This is a placeholder for demonstration
    setFolders([
      { id: 1, name: "Guides" },
      { id: 2, name: "Obsidian notes" },
      { id: 3, name: "Sheet" },
      { id: 4, name: "My Drive" },
      { id: 5, name: "hosting" },
      { id: 6, name: "Multi-tenant Cloud" },
      { id: 7, name: "Storage" },
      { id: 8, name: "backend" },
    ]);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-96">
        <h2 className="text-xl font-semibold mb-4">
          Move &quot;{fileName}&quot;
        </h2>
        <div className="mb-4">
          <p className="text-sm text-gray-600">Current location:</p>
          <p className="font-medium">{currentLocation.name}</p>
        </div>
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="font-medium">Suggested</span>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {folders.map((folder) => (
              <div
                key={folder.id}
                className="flex items-center justify-between py-2 px-3 hover:bg-gray-100 cursor-pointer"
                onClick={() => setSelectedFolder(folder)}
              >
                <div className="flex items-center">
                  <Folder className="mr-2 h-5 w-5" />
                  <span>{folder.name}</span>
                </div>
                <div
                  className={`w-4 h-4 rounded-full border ${
                    selectedFolder?.id === folder.id
                      ? "bg-blue-600 border-blue-600"
                      : "border-blue-300 border-2"
                  }`}
                />
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <button
            className="px-4 py-2 cursor-pointer text-gray-600 hover:bg-gray-100 rounded"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`px-4 py-2 text-white rounded ${
              selectedFolder
                ? "bg-blue-600 hover:bg-blue-700 cursor-pointer"
                : "bg-blue-400 cursor-not-allowed"
            }`}
            onClick={() => selectedFolder && onMove(selectedFolder.id)}
            disabled={!selectedFolder}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}
