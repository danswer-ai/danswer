"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePopup } from "@/components/admin/connectors/Popup";
import { FolderActions } from "./FolderActions";
import { FolderBreadcrumb } from "./FolderBreadcrumb";
import { FolderContents } from "./FolderContents";

interface FolderResponse {
  children: { name: string; id: number }[];
  files: { name: string; id: number }[];
  parents: { name: string; id: number }[];
}

export function MyDocuments() {
  const [currentFolder, setCurrentFolder] = useState<number>(-1);
  const [folderContents, setFolderContents] = useState<FolderResponse | null>(
    null
  );
  const searchParams = useSearchParams();
  const router = useRouter();
  const { popup, setPopup } = usePopup();

  useEffect(() => {
    const folderId = parseInt(searchParams.get("path") || "-1", 10);
    setCurrentFolder(folderId);
    fetchFolderContents(folderId);
  }, [searchParams]);

  const fetchFolderContents = async (folderId: number) => {
    try {
      const response = await fetch(`/api/user/folder/${folderId ?? -1}`);
      if (!response.ok) {
        throw new Error("Failed to fetch folder contents");
      }
      const data = await response.json();
      console.log("data");
      console.log(data);
      setFolderContents(data);
    } catch (error) {
      console.error("Error fetching folder contents:", error);
      setPopup({
        message: "Failed to fetch folder contents",
        type: "error",
      });
      3;
    }
  };

  const handleFolderClick = (id: number) => {
    router.push(`/my-documents?path=${id}`);
  };

  const handleBreadcrumbClick = (folderId: number) => {
    router.push(`/my-documents?path=${folderId}`);
  };

  const handleCreateFolder = async (folderName: string) => {
    try {
      const response = await fetch("/api/user/folder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderName, parent_id: currentFolder }),
      });
      if (response.ok) {
        fetchFolderContents(currentFolder);
        setPopup({
          message: "Folder created successfully",
          type: "success",
        });
      } else {
        throw new Error("Failed to create folder");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
      setPopup({
        message: "Failed to create folder",
        type: "error",
      });
    }
  };

  const handleDeleteItem = async (itemId: number, isFolder: boolean) => {
    try {
      const endpoint = isFolder
        ? `/api/user/folder/${itemId}`
        : `/api/user/file/${itemId}`;
      const response = await fetch(endpoint, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchFolderContents(currentFolder);
        setPopup({
          message: `${isFolder ? "Folder" : "File"} deleted successfully`,
          type: "success",
        });
      } else {
        throw new Error(`Failed to delete ${isFolder ? "folder" : "file"}`);
      }
    } catch (error) {
      console.error("Error deleting item:", error);
      setPopup({
        message: `Failed to delete ${isFolder ? "folder" : "file"}`,
        type: "error",
      });
    }
  };

  const handleUploadFiles = async (files: FileList) => {
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("files", files[i]);
    }
    formData.append("folder_id", currentFolder.toString());

    try {
      const response = await fetch("/api/user/file/upload", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        fetchFolderContents(currentFolder);
        setPopup({
          message: "Files uploaded successfully",
          type: "success",
        });
      } else {
        throw new Error("Failed to upload files");
      }
    } catch (error) {
      console.error("Error uploading files:", error);
      setPopup({
        message: "Failed to upload files",
        type: "error",
      });
    }
  };
  console.log("folderContents");
  console.log(folderContents);

  return (
    <div className="container mx-auto p-4">
      {popup}
      <FolderBreadcrumb
        currentFolder={{ name: "Current Folder", id: currentFolder }}
        parents={folderContents?.parents || []}
        onBreadcrumbClick={handleBreadcrumbClick}
      />
      <Card>
        <CardHeader>
          <CardTitle>Folder Contents</CardTitle>
          <FolderActions
            currentFolder={currentFolder}
            onRefresh={() => fetchFolderContents(currentFolder)}
            onCreateFolder={handleCreateFolder}
            onUploadFiles={handleUploadFiles}
          />
        </CardHeader>
        <CardContent>
          {folderContents ? (
            <FolderContents
              contents={folderContents}
              onFolderClick={handleFolderClick}
              currentFolder={currentFolder}
              onDeleteItem={handleDeleteItem}
            />
          ) : (
            <p>Loading...</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
