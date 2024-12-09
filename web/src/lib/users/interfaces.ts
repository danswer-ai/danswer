import { User } from "../types";

export interface AllUsersResponse {
  accepted: User[];
  invited: User[];
  accepted_pages: number;
  invited_pages: number;
}

export interface AcceptedUsersResponse {
  accepted: User[];
  accepted_pages: number;
}
