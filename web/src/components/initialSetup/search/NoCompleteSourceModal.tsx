"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CCPairBasicInfo } from "@/lib/types";
import { useRouter } from "next/navigation";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { AnimatePresence, motion } from "framer-motion";

export function NoCompleteSourcesModal({
  ccPairs,
}: {
  ccPairs: CCPairBasicInfo[];
}) {
  const router = useRouter();
  const [isHidden, setIsHidden] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      router.refresh();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // Trigger exit animation after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false); // Start exit animation
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  if (isHidden) {
    return null;
  }

  const totalDocs = ccPairs.reduce(
    (acc, ccPair) => acc + ccPair.docs_indexed,
    0
  );

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed z-notification top-5 right-0 md:right-5 mx-5 md:mx-0 md:w-96"
          initial={{ y: -100 }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          transition={{ duration: 0.2 }}
          onAnimationComplete={() => {
            if (!isVisible) setIsHidden(true);
          }}
        >
          <Alert>
            <AlertTitle className="font-semibold pb-2">
              ⏳ None of your connectors have finished a full sync yet
            </AlertTitle>
            <AlertDescription>
              <div>
                You&apos;ve connected some sources, but none of them have
                finished syncing. Depending on the size of the knowledge base(s)
                you&apos;ve connected to enMedD AI, it can take anywhere between
                30 seconds to a few days for the initial sync to complete. So
                far we&apos;ve synced <b>{totalDocs}</b> documents.
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
                  onClick={() => setIsVisible(false)}
                >
                  Or, click here to continue and ask questions on the partially
                  synced knowledge set.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
