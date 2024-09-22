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
            <AlertTitle className="font-semibold pb-2 leading-normal">
              ⏳ None of your data sources have finished a full sync yet
            </AlertTitle>
            <AlertDescription>
              <div>
                You&apos;ve connected some data sources, but none of them have
                finished syncing.
                <br />
                <br />
                To view the status of your syncing data sources, head over to
                the{" "}
                <Link className="text-link" href="admin/indexing/status">
                  Existing Data Sources page
                </Link>
                .
              </div>
            </AlertDescription>
          </Alert>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
