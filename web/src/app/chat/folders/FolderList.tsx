"use client";

import React, { useEffect, useRef, useState } from "react";
import { Folder } from "./interfaces";
import { ChatSessionDisplay } from "../sessionSidebar/ChatSessionDisplay";
import { BasicSelectable } from "@/components/BasicClickable";
import {
  addChatToFolder,
  deleteFolder,
  updateFolderName,
} from "./FolderManagement";
import { useRouter } from "next/navigation";
import { CHAT_SESSION_ID_KEY } from "@/lib/drag/constants";
import Cookies from "js-cookie";
import {
  ChevronDown,
  ChevronRight,
  Folder as FolderIcon,
  Pencil,
  Trash,
  Check,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const FolderItem = ({
  folder,
  currentChatId,
  isInitiallyExpanded,
}: {
  folder: Folder;
  currentChatId?: number;
  isInitiallyExpanded: boolean;
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(isInitiallyExpanded);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedFolderName, setEditedFolderName] = useState<string>(
    folder.folder_name
  );
  const [isHovering, setIsHovering] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const { toast } = useToast();
  const router = useRouter();

  const toggleFolderExpansion = () => {
    if (!isEditing) {
      const newIsExpanded = !isExpanded;
      setIsExpanded(newIsExpanded);
      // Update the cookie with the new state
      const openedFoldersCookieVal = Cookies.get("openedFolders");
      const openedFolders = openedFoldersCookieVal
        ? JSON.parse(openedFoldersCookieVal)
        : {};
      if (newIsExpanded) {
        openedFolders[folder.folder_id] = true;
      } else {
        setShowDeleteConfirm(false);

        delete openedFolders[folder.folder_id];
      }
      Cookies.set("openedFolders", JSON.stringify(openedFolders));
    }
  };

  const handleEditFolderName = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation(); // Prevent the event from bubbling up to the toggle expansion
    setIsEditing(true);
  };

  const handleFolderNameChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setEditedFolderName(event.target.value);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      saveFolderName();
    }
  };

  const saveFolderName = async (continueEditing?: boolean) => {
    try {
      await updateFolderName(folder.folder_id, editedFolderName);
      if (!continueEditing) {
        setIsEditing(false);
      }
      router.refresh(); // Refresh values to update the sidebar
    } catch (error) {
      toast({
        title: "Folder Name Update Failed",
        description: "Unable to save the folder name. Please try again.",
        variant: "destructive",
      });
    }
  };

  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const deleteConfirmRef = useRef<HTMLDivElement>(null);

  const handleDeleteClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    try {
      await deleteFolder(folder.folder_id);
      router.refresh();
    } catch (error) {
      toast({
        title: "Chat Session Addition Failed",
        description:
          "Unable to add the chat session to the folder. Please try again.",
        variant: "destructive",
      });
    }
  };

  const cancelDelete = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setShowDeleteConfirm(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        deleteConfirmRef.current &&
        !deleteConfirmRef.current.contains(event.target as Node)
      ) {
        setShowDeleteConfirm(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    const chatSessionId = parseInt(
      event.dataTransfer.getData(CHAT_SESSION_ID_KEY),
      10
    );
    try {
      await addChatToFolder(folder.folder_id, chatSessionId);
      router.refresh(); // Refresh to show the updated folder contents
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add chat session to folder",
        variant: "destructive",
      });
    }
  };

  const folders = folder.chat_sessions.sort((a, b) => {
    return a.time_created.localeCompare(b.time_created);
  });

  return (
    <div
      key={folder.folder_id}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`transition duration-300 ease-in-out rounded-xs ${
        isDragOver ? "bg-hover" : ""
      }`}
    >
      <BasicSelectable fullWidth selected={false}>
        <div
          onMouseEnter={() => setIsHovering(true)}
          onMouseLeave={() => setIsHovering(false)}
          className="w-full"
        >
          <div
            onClick={toggleFolderExpansion}
            className="cursor-pointer w-full"
          >
            <div className="text-sm flex items-center justify-start w-full">
              <div className="mr-2">
                {isExpanded ? (
                  <ChevronDown size={16} />
                ) : (
                  <ChevronRight size={16} />
                )}
              </div>
              <div>
                <FolderIcon size={16} className="mr-3" />
              </div>
              {isEditing ? (
                <input
                  ref={inputRef}
                  type="text"
                  value={editedFolderName}
                  onChange={handleFolderNameChange}
                  onKeyDown={handleKeyDown}
                  onBlur={() => saveFolderName(true)}
                  className="text-sm px-1 flex-1 min-w-0 -my-px mr-2"
                />
              ) : (
                <div className="break-all overflow-hidden whitespace-nowrap mr-3 text-ellipsis">
                  {editedFolderName || folder.folder_name}
                </div>
              )}
              {isHovering && !isEditing && (
                <div className="flex ml-auto my-auto">
                  <div
                    onClick={handleEditFolderName}
                    className="hover:bg-background-inverted/10 p-1 -m-1 rounded"
                  >
                    <Pencil size={16} />
                  </div>
                  <div
                    onClick={handleDeleteClick}
                    className="hover:bg-background-inverted/10 p-1 -m-1 rounded ml-2"
                  >
                    <Trash size={16} />
                  </div>
                </div>
              )}

              {isEditing && (
                <div className="flex ml-auto my-auto">
                  <div
                    onClick={() => saveFolderName()}
                    className="hover:bg-background-inverted/10 p-1 -m-1 rounded"
                  >
                    <Check size={16} />
                  </div>
                  <div
                    onClick={() => setIsEditing(false)}
                    className="hover:bg-background-inverted/10 p-1 -m-1 rounded ml-2"
                  >
                    <X size={16} />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </BasicSelectable>
      {isExpanded && folders && (
        <div className={"ml-2 pl-2 border-l border-border"}>
          {folders.map((chatSession) => (
            <ChatSessionDisplay
              key={chatSession.id}
              chatSession={chatSession}
              isSelected={chatSession.id === currentChatId}
              skipGradient={isDragOver}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const FolderList = ({
  folders,
  currentChatId,
  openedFolders,
}: {
  folders: Folder[];
  currentChatId?: number;
  openedFolders?: { [key: number]: boolean };
}) => {
  if (folders.length === 0) {
    return null;
  }

  return (
    <div className="mt-1 mb-1 overflow-visible">
      {folders.map((folder) => (
        <FolderItem
          key={folder.folder_id}
          folder={folder}
          currentChatId={currentChatId}
          isInitiallyExpanded={
            openedFolders ? openedFolders[folder.folder_id] || false : false
          }
        />
      ))}
      {folders.length == 1 && folders[0].chat_sessions.length == 0 && (
        <p className="text-xs font-normal text-subtle mt-2 px-4 ">
          {" "}
          Drag a chat into a folder to save for later{" "}
        </p>
      )}
    </div>
  );
};
