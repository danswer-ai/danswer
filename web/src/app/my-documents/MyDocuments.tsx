"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  Folder,
  File,
  Plus,
  Trash2,
  Upload,
  ArrowUp,
  FolderOpen,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { usePopup } from "@/components/admin/connectors/Popup";

interface FolderResponse {
  id: number;
  name: string;
  parent_id: number | null;
}

interface FileResponse {
  id: number;
  name: string;
  parent_folder_id: number | null;
}

interface FolderDetailResponse {
  id: number;
  name: string;
  parent_id: number | null;
  children: FolderResponse[];
  files: FileResponse[];
}

export default function MyDocumentsPage() {
  const [currentFolder, setCurrentFolder] =
    useState<FolderDetailResponse | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const { popup, setPopup } = usePopup();
  useEffect(() => {
    fetchFolder(null);
  }, []);

  const fetchFolder = async (folderId: number | null) => {
    try {
      const response = await fetch(`/api/user/folder/${folderId || ""}`);
      if (response.ok) {
        const data: FolderDetailResponse = await response.json();
        setCurrentFolder(data);
      } else {
        setPopup({
          message: "Failed to fetch folder",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error fetching folder:", error);
      setPopup({
        message: "An unexpected error occurred",
        type: "error",
      });
    }
  };

  const handleCreateFolder = async () => {
    if (!newItemName.trim()) return;

    try {
      const response = await fetch("/api/user/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newItemName.trim(),
          parent_id: currentFolder?.id || null,
        }),
      });

      if (response.ok) {
        setNewItemName("");
        fetchFolder(currentFolder?.id || null);
        setPopup({
          message: "Folder created successfully",
          type: "success",
        });
      } else {
        setPopup({
          message: "Failed to create folder",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      setPopup({
        message: "An unexpected error occurred",
        type: "error",
      });
    }
  };

  const handleDeleteItem = async (id: number, isFolder: boolean) => {
    try {
      const response = await fetch(
        `/api/user/${isFolder ? "folder" : "file"}/${id}`,
        {
          method: "DELETE",
        }
      );

      if (response.ok) {
        fetchFolder(currentFolder?.id || null);
        setPopup({
          message: `${isFolder ? "Folder" : "File"} deleted successfully`,
          type: "success",
        });
      } else {
        setPopup({
          message: `Failed to delete ${isFolder ? "folder" : "file"}`,
          type: "error",
        });
      }
    } catch (error) {
      console.error(`Error deleting ${isFolder ? "folder" : "file"}:`, error);
      setPopup({
        message: "An unexpected error occurred",
        type: "error",
      });
    }
  };

  const handleFileUpload = async () => {
    if (!selectedFiles) return;

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append("files", selectedFiles[i]);
    }
    formData.append("folder_id", currentFolder?.id?.toString() || "");

    try {
      const response = await fetch("/api/user/file/upload", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        setSelectedFiles(null);
        fetchFolder(currentFolder?.id || null);
        setPopup({
          message: "Files uploaded successfully",
          type: "success",
        });
      } else {
        setPopup({
          message: "Failed to upload files",
          type: "error",
        });
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      setPopup({
        message: "An unexpected error occurred",
        type: "error",
      });
    }
  };

  const handleNavigateUp = () => {
    if (currentFolder?.parent_id !== null) {
      fetchFolder(currentFolder?.parent_id || null);
    }
  };

  return (
    <div className="container mx-auto p-8 space-y-8">
      {popup}

      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Create Folder</h3>
              <div className="flex space-x-2">
                <Input
                  type="text"
                  placeholder="New folder name"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  className="flex-grow"
                />
                <Button onClick={handleCreateFolder} variant="default">
                  <Plus className="mr-2 h-4 w-4" /> Create
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Upload Files</h3>
              <div className="flex space-x-2">
                <Input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="flex-grow"
                />
                <Button onClick={handleFileUpload} variant="default">
                  <Upload className="mr-2 h-4 w-4" /> Upload
                </Button>
              </div>
            </div>
          </div>
          {currentFolder?.parent_id !== null && (
            <Button onClick={handleNavigateUp} variant="outline">
              <ArrowUp className="mr-2 h-4 w-4" /> Up to Parent Folder
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Folder: {currentFolder?.name || "Root"}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {currentFolder?.children.map((folder) => (
              <Card
                key={folder.id}
                className="hover:shadow-md transition-shadow duration-300 cursor-pointer"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle
                    className="text-lg font-medium flex items-center"
                    onClick={() => fetchFolder(folder.id)}
                  >
                    <FolderOpen className="mr-2 text-blue-500" />
                    {folder.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteItem(folder.id, true);
                    }}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
              </Card>
            ))}
            {currentFolder?.files.map((file) => (
              <Card
                key={file.id}
                className="hover:shadow-md transition-shadow duration-300"
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-medium flex items-center">
                    <File className="mr-2 text-green-500" />
                    {file.name}
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteItem(file.id, false)}
                    className="text-destructive hover:text-destructive/90"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardHeader>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
