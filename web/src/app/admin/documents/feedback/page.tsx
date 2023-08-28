"use client";

import { Button } from "@/components/Button";
import { LoadingAnimation } from "@/components/Loading";
import { BasicTable } from "@/components/admin/connectors/BasicTable";
import { usePopup } from "@/components/admin/connectors/Popup";
import { ThumbsUpIcon, UsersIcon } from "@/components/icons/icons";
import { fetcher } from "@/lib/fetcher";
import { useMostReactedToDocuments } from "@/lib/hooks";
import { User } from "@/lib/types";
import useSWR, { mutate } from "swr";

const columns = [
  {
    header: "Document Name",
    key: "name",
  },
  {
    header: "Boost",
    key: "boost",
  },
  {
    header: "Promote",
    key: "promote",
  },
];

const DocumentFeedbackTable = () => {
  const { popup, setPopup } = usePopup();

  const { data, isLoading, error, refreshDocs } = useMostReactedToDocuments();

  if (isLoading) {
    return <LoadingAnimation text="Loading" />;
  }

  if (error || !data) {
    return <div className="text-red-600">Error loading users</div>;
  }

  return (
    <div>
      {popup}
      <BasicTable
        columns={columns}
        data={data.map((documentBoostStatus) => {
          return {
            name: documentBoostStatus.semantic_id,
            boost: documentBoostStatus.boost,
            promote: "hi"
          };
        })}
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

      <DocumentFeedbackTable />
    </div>
  );
};

export default Page;
