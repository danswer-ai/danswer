import { DanswerDocument } from "@/lib/search/interfaces";
import { useState } from "react";
import { FileDescriptor } from "./interfaces";

interface DocumentInfo {
  num_chunks: number;
  num_tokens: number;
}

async function fetchDocumentLength(documentId: string) {
  const response = await fetch(
    `/api/document/document-size-info?document_id=${documentId}`
  );
  if (!response.ok) {
    return 0;
  }
  const data = (await response.json()) as DocumentInfo;
  return data.num_tokens;
}

export function useDocumentSelection(): [
  DanswerDocument[],
  (document: DanswerDocument) => void,
  () => void,
  number,
  FileDescriptor[],
  (file: FileDescriptor) => void,
] {
  const [selectedDocuments, setSelectedDocuments] = useState<DanswerDocument[]>(
    []
  );
  const [totalTokens, setTotalTokens] = useState(0);
  const [selectedFiles, setSelectedFiles] = useState<FileDescriptor[]>([]);
  const selectedDocumentIds = selectedDocuments.map(
    (document) => document.document_id
  );
  const documentIdToLength = new Map<string, number>();
  function toggleFileSelection(file: FileDescriptor) {
    const isAdding = !selectedFiles.includes(file);
    console.log("is adding", isAdding);
    console.log("selected files", selectedFiles);
    if (!isAdding) {
      setSelectedFiles(selectedFiles.filter((f) => f.id !== file.id));
    } else {
      setSelectedFiles([...selectedFiles, file]);
    }
  }

  function toggleDocumentSelection(document: DanswerDocument) {
    const documentId = document.document_id;
    const isAdding = !selectedDocumentIds.includes(documentId);
    if (!isAdding) {
      setSelectedDocuments(
        selectedDocuments.filter(
          (document) => document.document_id !== documentId
        )
      );
    } else {
      setSelectedDocuments([...selectedDocuments, document]);
    }
    if (documentIdToLength.has(documentId)) {
      const length = documentIdToLength.get(documentId)!;
      setTotalTokens(isAdding ? totalTokens + length : totalTokens - length);
    } else {
      fetchDocumentLength(documentId).then((length) => {
        documentIdToLength.set(documentId, length);
        setTotalTokens(isAdding ? totalTokens + length : totalTokens - length);
      });
    }
  }

  function clearDocuments() {
    setSelectedDocuments([]);
    setSelectedFiles([]);
    setTotalTokens(0);
  }

  return [
    selectedDocuments,
    toggleDocumentSelection,
    clearDocuments,
    totalTokens,
    selectedFiles,
    toggleFileSelection,
  ];
}
