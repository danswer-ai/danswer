"use client";

import { LoadingAnimation } from "@/components/Loading";
import { PageSelector } from "@/components/PageSelector";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { PopupSpec, usePopup } from "@/components/admin/connectors/Popup";
import {
  CheckmarkIcon,
  EditIcon,
  ThumbsUpIcon,
} from "@/components/icons/icons";
import { useMostReactedToDocuments } from "@/lib/hooks";
import { DocumentBoostStatus, User } from "@/lib/types";
import { useState } from "react";

const numPages = 8;
const numToDisplay = 10;

const updateBoost = async (documentId: string, boost: number) => {
  const response = await fetch("/api/manage/admin/doc-boosts", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      document_id: documentId,
      boost,
    }),
  });
  if (response.ok) {
    return null;
  }
  const responseJson = await response.json();
  return responseJson.message || responseJson.detail || "Unknown error";
};

const ScoreSection = ({
  documentId,
  initialScore,
  setPopup,
  refresh,
}: {
  documentId: string;
  initialScore: number;
  setPopup: (popupSpec: PopupSpec | null) => void;
  refresh: () => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [score, setScore] = useState(initialScore.toString());

  const onSubmit = async () => {
    const numericScore = Number(score);
    if (isNaN(numericScore)) {
      setPopup({
        message: "Score must be a number",
        type: "error",
      });
      return;
    }

    const errorMsg = await updateBoost(documentId, numericScore);
    if (errorMsg) {
      setPopup({
        message: errorMsg,
        type: "error",
      });
    } else {
      setPopup({
        message: "Updated score!",
        type: "success",
      });
      refresh();
      setIsOpen(false);
    }
  };

  if (isOpen) {
    return (
      <div className="m-auto flex">
        <input
          value={score}
          onChange={(e) => {
            setScore(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              onSubmit();
            }
            if (e.key === "Escape") {
              setIsOpen(false);
              setScore(initialScore.toString());
            }
          }}
          className="border bg-slate-700 text-gray-200 border-gray-300 rounded py-1 px-3 w-16"
        />
        <div onClick={onSubmit} className="cursor-pointer my-auto ml-2">
          <CheckmarkIcon size={20} className="text-green-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex my-auto">
        <div className="w-6 flex">
          <div className="ml-auto">{initialScore}</div>
        </div>
        <div className="cursor-pointer ml-2" onClick={() => setIsOpen(true)}>
          <EditIcon size={20} />
        </div>
      </div>
    </div>
  );
};

interface DocumentFeedbackTableProps {
  documents: DocumentBoostStatus[];
  refresh: () => void;
}

const DocumentFeedbackTable = ({
  documents,
  refresh,
}: DocumentFeedbackTableProps) => {
  const [page, setPage] = useState(1);
  const { popup, setPopup } = usePopup();

  return (
    <div>
      {popup}
      <BasicTable
        columns={[
          {
            header: "Document Name",
            key: "name",
          },
          {
            header: "Score",
            key: "score",
            alignment: "right",
          },
        ]}
        data={documents
          .slice((page - 1) * numToDisplay, page * numToDisplay)
          .map((document) => {
            return {
              name: (
                <a
                  className="text-blue-600"
                  href={document.link}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {document.semantic_id}
                </a>
              ),
              score: (
                <div className="ml-auto flex w-16">
                  <div key={document.document_id} className="h-10 ml-auto mr-8">
                    <ScoreSection
                      documentId={document.document_id}
                      initialScore={document.boost}
                      refresh={refresh}
                      setPopup={setPopup}
                    />
                  </div>
                </div>
              ),
            };
          })}
      />
      <div className="mt-3 flex">
        <div className="mx-auto">
          <PageSelector
            totalPages={Math.ceil(documents.length / numToDisplay)}
            currentPage={page}
            onPageChange={(newPage) => setPage(newPage)}
          />
        </div>
      </div>
    </div>
  );
};

const Main = () => {
  const {
    data: mostLikedDocuments,
    isLoading: isMostLikedDocumentsLoading,
    error: mostLikedDocumentsError,
    refreshDocs: refreshMostLikedDocuments,
  } = useMostReactedToDocuments(false, numToDisplay * numPages);

  const {
    data: mostDislikedDocuments,
    isLoading: isMostLikedDocumentLoading,
    error: mostDislikedDocumentsError,
    refreshDocs: refreshMostDislikedDocuments,
  } = useMostReactedToDocuments(true, numToDisplay * numPages);

  const refresh = () => {
    refreshMostLikedDocuments();
    refreshMostDislikedDocuments();
  };

  if (isMostLikedDocumentsLoading || isMostLikedDocumentLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  if (
    mostLikedDocumentsError ||
    mostDislikedDocumentsError ||
    !mostLikedDocuments ||
    !mostDislikedDocuments
  ) {
    return (
      <div className="text-red-600">
        Error loading documents -{" "}
        {mostDislikedDocumentsError || mostLikedDocumentsError}
      </div>
    );
  }

  return (
    <div className="mb-8">
      <h2 className="font-bold text-xl mb-2">Most Liked Documents</h2>
      <DocumentFeedbackTable documents={mostLikedDocuments} refresh={refresh} />

      <h2 className="font-bold text-xl mb-2 mt-4">Most Disliked Documents</h2>
      <DocumentFeedbackTable
        documents={mostDislikedDocuments}
        refresh={refresh}
      />
    </div>
  );
};

const Page = () => {
  return (
    <div>
      <div className="border-solid border-gray-600 border-b pb-2 mb-4 flex">
        <ThumbsUpIcon size={32} />
        <h1 className="text-3xl font-bold pl-2">Document Feedback</h1>
      </div>

      <Main />
    </div>
  );
};

export default Page;
