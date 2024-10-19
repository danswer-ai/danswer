export interface TeamspaceUpdate {
  user_ids: string[];
  cc_pair_ids: number[];
}

export interface SetCuratorRequest {
  user_id: string;
  is_curator: boolean;
}
export interface TeamspaceCreation {
  name: string;
  user_ids: string[];
  cc_pair_ids: number[];
}
