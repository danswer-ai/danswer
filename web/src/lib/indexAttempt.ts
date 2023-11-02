import { IndexAttemptSnapshot } from "./types";

export const getDocsProcessedPerMinute = (
  indexAttempt: IndexAttemptSnapshot | null
): number | null => {
  if (
    !indexAttempt ||
    !indexAttempt.time_started ||
    !indexAttempt.time_updated ||
    indexAttempt.total_docs_indexed === 0
  ) {
    return null;
  }

  const timeStarted = new Date(indexAttempt.time_started);
  const timeUpdated = new Date(indexAttempt.time_updated);
  const timeDiff = timeUpdated.getTime() - timeStarted.getTime();
  const seconds = timeDiff / 1000;
  return (indexAttempt.total_docs_indexed / seconds) * 60;
};
