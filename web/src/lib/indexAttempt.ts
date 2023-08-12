import { IndexAttemptSnapshot } from "./types";

export const getDocsProcessedPerMinute = (
  indexAttempt: IndexAttemptSnapshot | null
): number | null => {
  if (
    !indexAttempt ||
    !indexAttempt.time_started ||
    !indexAttempt.time_updated ||
    indexAttempt.num_docs_indexed === 0
  ) {
    return null;
  }

  const timeStarted = new Date(indexAttempt.time_started);
  const timeUpdated = new Date(indexAttempt.time_updated);
  const timeDiff = timeUpdated.getTime() - timeStarted.getTime();
  const seconds = timeDiff / 1000;
  // due to some issues with `time_updated` having delayed updates,
  // the docs / min will be really high at first. To avoid this,
  // we can wait a little bit to let the updated_at catch up a bit
  if (seconds < 10) {
    return null;
  }
  return (indexAttempt.num_docs_indexed / seconds) * 60;
};
