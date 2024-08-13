import { UserRole } from "@/lib/types";

interface APIKey {
  api_key_id: number;
  api_key_display: string;
  api_key: string | null;
  api_key_name: string | null;
  api_key_role: UserRole;
  user_id: string;
}

interface APIKeyArgs {
  name?: string;
  role: UserRole;
}
