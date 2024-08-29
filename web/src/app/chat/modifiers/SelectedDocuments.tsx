import { BasicClickable } from "@/components/BasicClickable";
import { EnmeddDocument } from "@/lib/search/interfaces";
import { useState } from "react";
import { FiBook, FiFilter } from "react-icons/fi";

export function SelectedDocuments({
  selectedDocuments,
}: {
  selectedDocuments: EnmeddDocument[];
}) {
  if (selectedDocuments.length === 0) {
    return null;
  }

  return (
    <BasicClickable>
      <div className="flex text-xs max-w-md overflow-hidden">
        <FiBook className="my-auto mr-1" />{" "}
        <div className="w-fit whitespace-nowrap">
          Chatting with {selectedDocuments.length} Selected Documents
        </div>
      </div>
    </BasicClickable>
  );
}
