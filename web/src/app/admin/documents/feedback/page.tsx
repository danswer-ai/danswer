"use client";

import { LoadingAnimation } from "@/components/Loading";
import { ThumbsUpIcon } from "@/components/icons/icons";
import { useMostReactedToDocuments } from "@/lib/hooks";
import { DocumentFeedbackTable } from "./DocumentFeedbackTable";
import { numPages, numToDisplay } from "./constants";

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
