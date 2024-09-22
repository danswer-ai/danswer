import { useState } from "react";
import { ChatFileType, FileDescriptor } from "../interfaces";
import { DocumentPreview } from "./documents/DocumentPreview";
import { InputBarPreviewImage } from "./images/InputBarPreviewImage";
import { Loader, X } from "lucide-react";

function DeleteButton({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      onClick={onDelete}
      className="
        absolute
        -top-1
        -right-1
        cursor-pointer
        border-none
        bg-hover
        p-1
        rounded-full
        z-10
      "
    >
      <X />
    </button>
  );
}

export function InputBarPreview({
  file,
  onDelete,
  isUploading,
}: {
  file: FileDescriptor;
  onDelete: () => void;
  isUploading: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const renderContent = () => {
    if (file.type === ChatFileType.IMAGE) {
      return <InputBarPreviewImage fileId={file.id} />;
    }
    return <DocumentPreview fileName={file.name || file.id} />;
  };

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isHovered && <DeleteButton onDelete={onDelete} />}
      {isUploading && (
        <div
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            bg-background-inverted
            bg-opacity-50
            rounded-regular
            z-0
          "
        >
          <Loader className="animate-spin text-inverted" />
        </div>
      )}
      {renderContent()}
    </div>
  );
}
