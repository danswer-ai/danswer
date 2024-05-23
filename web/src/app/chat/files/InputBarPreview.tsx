import { ChatFileType, FileDescriptor } from "../interfaces";
import { FileItem } from "./documents/DocumentPreview";
import { InputBarPreviewImage } from "./images/InputBarPreviewImage";

export function InputBarPreview({
  file,
  onDelete,
}: {
  file: FileDescriptor;
  onDelete: () => void;
}) {
  if (file.type === ChatFileType.IMAGE) {
    return <InputBarPreviewImage fileId={file.id} onDelete={onDelete} />;
  }

  return <FileItem fileName={file.name || file.id} onDelete={onDelete} />;
}
