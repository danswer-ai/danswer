"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CCPairBasicInfo } from "@/lib/types";
import { useRouter } from "next/navigation";
import { CustomModal } from "@/components/CustomModal";

export function NoCompleteSourcesModal({
  ccPairs,
}: {
  ccPairs: CCPairBasicInfo[];
}) {
  const router = useRouter();
  const [isHidden, setIsHidden] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (isHidden) {
    return null;
  }

  const totalDocs = ccPairs.reduce(
    (acc, ccPair) => acc + ccPair.docs_indexed,
    0
  );

  return (
    <CustomModal
      open={!isHidden}
      onClose={() => setIsHidden(true)}
      trigger={null}
    >
      <h2 className="text-2xl font-semibold pb-6">
        ⏳ None of your connectors have finished a full sync yet
      </h2>
      <div>
        You&apos;ve connected some sources, but none of them have finished
        syncing. Depending on the size of the knowledge base(s) you&apos;ve
        connected to enMedD AI, it can take anywhere between 30 seconds to a few
        days for the initial sync to complete. So far we&apos;ve synced{" "}
        <b>{totalDocs}</b> documents.
        <br />
        <br />
        To view the status of your syncing connectors, head over to the{" "}
        <Link className="text-link" href="admin/indexing/status">
          Existing Connectors page
        </Link>
        .
        <br />
        <br />
        <p
          className="inline cursor-pointer text-link"
          onClick={() => {
            setIsHidden(true);
          }}
        >
          Or, click here to continue and ask questions on the partially synced
          knowledge set.
        </p>
      </div>
    </CustomModal>
  );
}
