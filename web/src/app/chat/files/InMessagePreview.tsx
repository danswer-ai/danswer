import { ChatFileType, FileDescriptor } from "../interfaces";
import { InMessageImage } from "./images/InMessageImage";
import { FileItem } from "./documents/DocumentPreview";

export function InMessagePreview({ file }: { file: FileDescriptor }) {
  if (file.type === ChatFileType.IMAGE) {
    return <InMessageImage fileId={file.id} />;
  }

  return <FileItem fileName={file.name || file.id} />;
}
