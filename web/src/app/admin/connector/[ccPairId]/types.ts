import { Connector } from "@/lib/ccs/connectors";
import { Credential } from "@/lib/ccs/credentials";
import { DeletionAttemptSnapshot, IndexAttemptSnapshot } from "@/lib/types";

export interface CCPairFullInfo {
  id: number;
  name: string;
  num_docs_indexed: number;
  connector: Connector<any>;
  credential: Credential<any>;
  index_attempts: IndexAttemptSnapshot[];
  latest_deletion_attempt: DeletionAttemptSnapshot | null;
}
