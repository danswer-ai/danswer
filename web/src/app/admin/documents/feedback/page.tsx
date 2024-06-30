"use client";

import { LoadingAnimation } from "@/components/Loading";
import { ThumbsUpIcon } from "@/components/icons/icons";
import { useMostReactedToDocuments } from "@/lib/hooks";
import { DocumentFeedbackTable } from "@/components/adminPageComponents/documents/AdminDocumentsFeedbackTable";
import { AdminPageTitle } from "@/components/adminPageComponents/Title";
import { Title } from "@tremor/react";

const numPages = 8;
const numToDisplay = 10;

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
      <Title className="mb-2">Most Liked Documents</Title>
      <DocumentFeedbackTable documents={mostLikedDocuments} refresh={refresh} />

      <Title className="mb-2 mt-6">Most Disliked Documents</Title>
      <DocumentFeedbackTable
        documents={mostDislikedDocuments}
        refresh={refresh}
      />
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto">
      <AdminPageTitle
        icon={<ThumbsUpIcon size={32} />}
        title="Document Feedback"
      />

      <Main />
    </div>
  );
};

export default Page;
