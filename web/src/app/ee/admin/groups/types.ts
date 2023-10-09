import { CCPairDescriptor, User } from "@/lib/types";

export interface UserGroupUpdate {
  user_ids: string[];
  cc_pair_ids: number[];
}

export interface UserGroup {
  id: number;
  name: string;
  users: User[];
  cc_pairs: CCPairDescriptor<any, any>[];
  is_up_to_date: boolean;
  is_up_for_deletion: boolean;
}

export interface UserGroupCreation {
  name: string;
  user_ids: string[];
  cc_pair_ids: number[];
}
