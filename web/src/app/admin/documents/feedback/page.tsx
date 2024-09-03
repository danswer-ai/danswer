"use client";

import { LoadingAnimation } from "@/components/Loading";
import { ThumbsUpIcon } from "@/components/icons/icons";
import { useMostReactedToDocuments } from "@/lib/hooks";
import { DocumentFeedbackTable } from "./DocumentFeedbackTable";
import { numPages, numToDisplay } from "./constants";
import { AdminPageTitle } from "@/components/admin/Title";
import { Title } from "@tremor/react";

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
    <div className="space-y-24">
      <div>
        <h3 className="pb-5 font-semibold">Most Liked Documents</h3>
        <DocumentFeedbackTable
          documents={mostLikedDocuments}
          refresh={refresh}
        />
      </div>

      <div>
        <h3 className=" pb-5 font-semibold">Most Disliked Documents</h3>
        <DocumentFeedbackTable
          documents={mostDislikedDocuments}
          refresh={refresh}
        />
      </div>
    </div>
  );
};

const Page = () => {
  return (
    <div className="container mx-auto py-24 md:py-32 lg:pt-16">
      <AdminPageTitle
        icon={<ThumbsUpIcon size={32} />}
        title="Document Feedback"
      />

      <Main />
    </div>
  );
};

export default Page;
