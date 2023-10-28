import {
  Connector,
  Credential,
  DeletionAttemptSnapshot,
  IndexAttemptSnapshot,
} from "@/lib/types";

export interface CCPairFullInfo {
  id: number;
  name: string;
  new_docs_indexed: number;
  connector: Connector<any>;
  credential: Credential<any>;
  index_attempts: IndexAttemptSnapshot[];
  latest_deletion_attempt: DeletionAttemptSnapshot | null;
}
