export interface TeamspaceUpdate {
  user_ids: string[];
  cc_pair_ids: number[];
}

export interface TeamspaceCreation {
  name: string;
  user_ids: string[];
  cc_pair_ids: number[];
}
