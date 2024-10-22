import { BasicClickable } from "@/components/BasicClickable";
import { EnmeddDocument } from "@/lib/search/interfaces";
import { Book } from "lucide-react";

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
        <Book className="my-auto mr-1" size={16} />{" "}
        <div className="w-fit whitespace-nowrap">
          Chatting with {selectedDocuments.length} Selected Documents
        </div>
      </div>
    </BasicClickable>
  );
}
