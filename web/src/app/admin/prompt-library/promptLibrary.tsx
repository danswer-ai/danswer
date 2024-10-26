"use client";

import { EditIcon, TrashIcon } from "@/components/icons/icons";
import { PopupSpec } from "@/components/admin/connectors/Popup";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { useState } from "react";
import { FilterDropdown } from "@/components/search/filtering/FilterDropdown";
import { FiTag } from "react-icons/fi";
import { PageSelector } from "@/components/PageSelector";
import { InputPrompt } from "./interfaces";
import { Modal } from "@/components/Modal";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CustomTooltip } from "@/components/CustomTooltip";

const CategoryBubble = ({
  name,
  onDelete,
}: {
  name: string;
  onDelete?: () => void;
}) => (
  <span
    className={`
        inline-block
        px-2
        py-1
        mr-1
        mb-1
        text-xs
        font-semibold
        text-emphasis
        bg-hover
        rounded-full
        items-center
        w-fit
        ${onDelete ? "cursor-pointer" : ""}
      `}
    onClick={onDelete}
  >
    {name}
    {onDelete && (
      <button
        className="ml-1 text-subtle hover:text-emphasis"
        aria-label="Remove category"
      >
        &times;
      </button>
    )}
  </span>
);

const NUM_RESULTS_PER_PAGE = 10;

export const PromptLibraryTable = ({
  promptLibrary,
  refresh,
  setPopup,
  handleEdit,
  isPublic,
}: {
  promptLibrary: InputPrompt[];
  refresh: () => void;
  setPopup: (popup: PopupSpec | null) => void;
  handleEdit: (promptId: number) => void;
  isPublic: boolean;
}) => {
  const [query, setQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  const columns = [
    { name: "Prompt", key: "prompt" },
    { name: "Content", key: "content" },
    { name: "Status", key: "status" },
    { name: "", key: "edit" },
    { name: "", key: "delete" },
  ];

  const filteredPromptLibrary = promptLibrary.filter((item) => {
    const cleanedQuery = query.toLowerCase();
    const searchMatch =
      item.prompt.toLowerCase().includes(cleanedQuery) ||
      item.content.toLowerCase().includes(cleanedQuery);
    const statusMatch =
      selectedStatus.length === 0 ||
      (selectedStatus.includes("Active") && item.active) ||
      (selectedStatus.includes("Inactive") && !item.active);

    return searchMatch && statusMatch;
  });

  const totalPages = Math.ceil(
    filteredPromptLibrary.length / NUM_RESULTS_PER_PAGE
  );
  const startIndex = (currentPage - 1) * NUM_RESULTS_PER_PAGE;
  const endIndex = startIndex + NUM_RESULTS_PER_PAGE;
  const paginatedPromptLibrary = filteredPromptLibrary.slice(
    startIndex,
    endIndex
  );

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleDelete = async (id: number) => {
    const response = await fetch(
      `/api${isPublic ? "/admin" : ""}/input_prompt/${id}`,
      {
        method: "DELETE",
      }
    );
    if (!response.ok) {
      setPopup({ message: "Failed to delete input prompt", type: "error" });
    }
    refresh();
  };

  const handleStatusSelect = (status: string) => {
    setSelectedStatus((prev) => {
      if (prev.includes(status)) {
        return prev.filter((s) => s !== status);
      }
      return [...prev, status];
    });
  };

  const [confirmDeletionId, setConfirmDeletionId] = useState<number | null>(
    null
  );

  return (
    <div className="justify-center py-2">
      {confirmDeletionId != null && (
        <Modal
          onOutsideClick={() => setConfirmDeletionId(null)}
          className="max-w-sm"
        >
          <>
            <p className="mb-2 text-lg">
              Are you sure you want to delete this prompt? You will not be able
              to recover this prompt
            </p>
            <div className="flex justify-between mt-6">
              <button
                className="rounded py-1.5 px-2 bg-background-800 text-text-200"
                onClick={async () => {
                  await handleDelete(confirmDeletionId);
                  setConfirmDeletionId(null);
                }}
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDeletionId(null)}
                className="rounded py-1.5 px-2 bg-background-150 text-text-800"
              >
                {" "}
                No
              </button>
            </div>
          </>
        </Modal>
      )}

      <div className="relative">
        <MagnifyingGlass className="absolute -translate-y-1/2 left-4 top-1/2" />
        <Input
          placeholder="Find prompts..."
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setCurrentPage(1);
          }}
          className="pl-10"
        />
      </div>
      <div className="my-4 border-b border-border">
        <FilterDropdown
          options={[
            { key: "Active", display: "Active" },
            { key: "Inactive", display: "Inactive" },
          ]}
          selected={selectedStatus}
          handleSelect={(option) => handleStatusSelect(option.key)}
          icon={<FiTag size={16} />}
          defaultDisplay="All Statuses"
        />
        <div className="flex flex-wrap pb-4 mt-3">
          {selectedStatus.map((status) => (
            <CategoryBubble
              key={status}
              name={status}
              onDelete={() => handleStatusSelect(status)}
            />
          ))}
        </div>
      </div>
      <div className="mx-auto overflow-x-auto">
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((column) => (
                    <TableHead key={column.key}>{column.name}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedPromptLibrary.length > 0 ? (
                  paginatedPromptLibrary
                    .filter((prompt) => !(!isPublic && prompt.is_public))
                    .map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.prompt}</TableCell>
                        <TableCell className="max-w-xs overflow-hidden break-words text-ellipsis">
                          {item.content}
                        </TableCell>
                        <TableCell>
                          {item.active ? (
                            <Badge>Active</Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <CustomTooltip
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setConfirmDeletionId(item.id)}
                              >
                                <TrashIcon size={20} />
                              </Button>
                            }
                            asChild
                          >
                            Delete
                          </CustomTooltip>
                        </TableCell>
                        <TableCell>
                          <CustomTooltip
                            trigger={
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(item.id)}
                              >
                                <EditIcon size={16} />
                              </Button>
                            }
                            asChild
                          >
                            Edit
                          </CustomTooltip>
                        </TableCell>
                      </TableRow>
                    ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6}>
                      No matching prompts found...
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        {paginatedPromptLibrary.length > 0 && (
          <div className="flex justify-center mt-4">
            <PageSelector
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              shouldScroll={true}
            />
          </div>
        )}
      </div>
    </div>
  );
};
